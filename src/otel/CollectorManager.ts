import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';
import https from 'https';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import {
  generateCollectorConfig,
  getDefaultCollectorPaths,
  getDefaultPorts,
  CollectorConfig,
} from './CollectorConfigGenerator.js';

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const chmod = promisify(fs.chmod);
const unlink = promisify(fs.unlink);

/**
 * Manages OpenTelemetry Collector lifecycle
 */
export class CollectorManager {
  private collectorProcess: ChildProcess | null = null;
  private sessionId?: string;
  private paths: ReturnType<typeof getDefaultCollectorPaths>;

  constructor(sessionId?: string) {
    this.sessionId = sessionId;
    this.paths = getDefaultCollectorPaths(sessionId);
  }

  /**
   * Detect platform and architecture for collector binary download
   */
  private getPlatformInfo(): { platform: string; arch: string; extension: string } {
    const platform = os.platform();
    const arch = os.arch();

    let collectorPlatform: string;
    let collectorArch: string;
    let extension = '';

    // Map Node.js platform to collector platform names
    switch (platform) {
      case 'darwin':
        collectorPlatform = 'darwin';
        break;
      case 'linux':
        collectorPlatform = 'linux';
        break;
      case 'win32':
        collectorPlatform = 'windows';
        extension = '.exe';
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }

    // Map Node.js arch to collector arch names
    switch (arch) {
      case 'x64':
        collectorArch = 'amd64';
        break;
      case 'arm64':
        collectorArch = 'arm64';
        break;
      default:
        throw new Error(`Unsupported architecture: ${arch}`);
    }

    return { platform: collectorPlatform, arch: collectorArch, extension };
  }

  /**
   * Download OpenTelemetry Collector binary
   */
  async downloadCollector(version: string = 'v0.91.0'): Promise<void> {
    const { platform, arch, extension } = this.getPlatformInfo();
    const binaryName = `otelcol${extension}`;

    // OpenTelemetry Collector download URL
    const downloadUrl = `https://github.com/open-telemetry/opentelemetry-collector-releases/releases/download/${version}/otelcol_${version}_${platform}_${arch}.tar.gz`;

    console.log(`Downloading OpenTelemetry Collector from ${downloadUrl}...`);

    // Ensure collector directory exists
    await mkdir(this.paths.collectorDir, { recursive: true });

    return new Promise((resolve, reject) => {
      https
        .get(downloadUrl, (response) => {
          if (response.statusCode === 302 || response.statusCode === 301) {
            // Follow redirect
            const redirectUrl = response.headers.location;
            if (!redirectUrl) {
              reject(new Error('Redirect without location header'));
              return;
            }
            https
              .get(redirectUrl, (redirectResponse) => {
                this.extractBinary(redirectResponse, binaryName, resolve, reject);
              })
              .on('error', reject);
          } else if (response.statusCode === 200) {
            this.extractBinary(response, binaryName, resolve, reject);
          } else {
            reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
          }
        })
        .on('error', reject);
    });
  }

  /**
   * Extract binary from tar.gz stream
   */
  private extractBinary(
    stream: NodeJS.ReadableStream,
    binaryName: string,
    resolve: () => void,
    reject: (error: Error) => void
  ): void {
    const { spawn } = require('child_process');
    const tar = spawn('tar', ['-xz', '-C', this.paths.collectorDir, binaryName]);

    stream.pipe(tar.stdin);

    tar.on('close', async (code: number) => {
      if (code === 0) {
        // Rename to standard name and make executable
        const extractedPath = path.join(this.paths.collectorDir, binaryName);
        try {
          if (fs.existsSync(extractedPath)) {
            await chmod(extractedPath, 0o755);
            // Rename to standard name if needed
            if (binaryName !== 'otel-collector') {
              fs.renameSync(extractedPath, this.paths.binaryPath);
            }
          }
          console.log('OpenTelemetry Collector downloaded successfully');
          resolve();
        } catch (error) {
          reject(error as Error);
        }
      } else {
        reject(new Error(`Failed to extract collector binary: exit code ${code}`));
      }
    });

    tar.on('error', reject);
  }

  /**
   * Check if collector binary exists
   */
  isCollectorInstalled(): boolean {
    return fs.existsSync(this.paths.binaryPath);
  }

  /**
   * Ensure collector is installed, download if not
   */
  async ensureCollectorInstalled(): Promise<void> {
    if (!this.isCollectorInstalled()) {
      await this.downloadCollector();
    }
  }

  /**
   * Generate and write collector configuration
   */
  async writeConfig(): Promise<void> {
    const ports = getDefaultPorts();
    const config: CollectorConfig = {
      httpPort: ports.httpPort,
      grpcPort: ports.grpcPort,
      logsFilePath: this.paths.logsPath,
      metricsFilePath: this.paths.metricsPath,
      sessionId: this.sessionId,
    };

    const configYaml = generateCollectorConfig(config);

    // Ensure directories exist
    await mkdir(this.paths.collectorDir, { recursive: true });
    await mkdir(path.dirname(this.paths.logsPath), { recursive: true });

    await writeFile(this.paths.configPath, configYaml, 'utf8');
  }

  /**
   * Start the OpenTelemetry Collector
   */
  async start(): Promise<void> {
    if (this.collectorProcess) {
      throw new Error('Collector is already running');
    }

    await this.ensureCollectorInstalled();
    await this.writeConfig();

    // Open log files
    const stdout = fs.openSync(this.paths.stdoutPath, 'a');
    const stderr = fs.openSync(this.paths.stderrPath, 'a');

    // Start collector process
    this.collectorProcess = spawn(this.paths.binaryPath, ['--config', this.paths.configPath], {
      detached: false,
      stdio: ['ignore', stdout, stderr],
    });

    // Write PID file
    await writeFile(this.paths.pidPath, String(this.collectorProcess.pid), 'utf8');

    // Wait a bit for startup
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify it's running
    if (!this.isRunning()) {
      throw new Error('Collector failed to start');
    }

    console.log(`OpenTelemetry Collector started (PID: ${this.collectorProcess.pid})`);
  }

  /**
   * Stop the OpenTelemetry Collector
   */
  async stop(): Promise<void> {
    if (!this.collectorProcess) {
      return;
    }

    return new Promise((resolve) => {
      if (this.collectorProcess) {
        this.collectorProcess.on('close', () => {
          this.collectorProcess = null;
          resolve();
        });

        this.collectorProcess.kill('SIGTERM');

        // Force kill after 5 seconds
        setTimeout(() => {
          if (this.collectorProcess) {
            this.collectorProcess.kill('SIGKILL');
          }
        }, 5000);
      } else {
        resolve();
      }
    });
  }

  /**
   * Check if collector is running
   */
  isRunning(): boolean {
    if (!this.collectorProcess) {
      return false;
    }

    try {
      // Check if process exists
      process.kill(this.collectorProcess.pid!, 0);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get collector process PID
   */
  getPid(): number | null {
    return this.collectorProcess?.pid ?? null;
  }

  /**
   * Get paths used by collector
   */
  getPaths(): ReturnType<typeof getDefaultCollectorPaths> {
    return this.paths;
  }

  /**
   * Clean up old PID files and logs
   */
  async cleanup(): Promise<void> {
    try {
      if (fs.existsSync(this.paths.pidPath)) {
        await unlink(this.paths.pidPath);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}
