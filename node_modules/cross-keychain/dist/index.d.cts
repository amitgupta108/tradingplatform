/**
 * Represents a credential with username and password.
 */
interface Credential {
    username: string;
    password: string;
}
/**
 * The core interface that all keyring backends must implement.
 * Provides methods for storing, retrieving, and deleting passwords securely.
 */
interface SecretStorageBackend {
    /** Unique identifier for this backend */
    readonly id: string;
    /** Human-readable name describing this backend */
    readonly name: string;
    /** Priority for automatic backend selection (higher values are preferred) */
    readonly priority: number;
    /**
     * Retrieves a password for the specified service and account.
     *
     * @param service - The service identifier
     * @param account - The account/username identifier
     * @returns The stored password, or null if not found
     */
    getPassword(service: string, account: string): Promise<string | null>;
    /**
     * Stores a password for the specified service and account.
     *
     * @param service - The service identifier
     * @param account - The account/username identifier
     * @param password - The password to store
     */
    setPassword(service: string, account: string, password: string): Promise<void>;
    /**
     * Deletes a stored password for the specified service and account.
     *
     * @param service - The service identifier
     * @param account - The account/username identifier
     */
    deletePassword(service: string, account: string): Promise<void>;
    /**
     * Retrieves a credential (username and password) for a service.
     * If account is not specified, returns the first credential found for the service.
     *
     * @param service - The service identifier
     * @param account - Optional account/username identifier
     * @returns The credential object, or null if not found
     */
    getCredential(service: string, account?: string | null): Promise<Credential | null>;
    /**
     * Creates a new instance of this backend with updated properties.
     * Used for runtime configuration of backends.
     *
     * @param properties - Configuration properties to merge with existing ones
     * @returns A new backend instance with the merged properties
     */
    withProperties(properties: Record<string, unknown>): SecretStorageBackend;
    /**
     * Returns diagnostic information about this backend's configuration and state.
     * Useful for debugging and troubleshooting.
     *
     * @returns Diagnostic information as key-value pairs
     */
    diagnose(): Promise<Record<string, unknown>>;
}
/**
 * Factory function interface for creating backend instances.
 * Backends can optionally provide an isSupported method to check platform compatibility.
 */
interface BackendFactory {
    new (properties?: Record<string, unknown>): SecretStorageBackend;
    isSupported?: () => boolean | Promise<boolean>;
    readonly prototype: SecretStorageBackend;
}
/**
 * Function type for filtering which backends are allowed.
 * Used to restrict backend selection based on custom criteria.
 */
type BackendLimit = (backend: SecretStorageBackend) => boolean;
/**
 * Basic information about an available backend.
 * Used when listing available backends to users.
 */
interface BackendInfo {
    /** Unique identifier for this backend */
    id: string;
    /** Human-readable name describing this backend */
    name: string;
    /** Priority for automatic backend selection (higher values are preferred) */
    priority: number;
}
/**
 * Configuration file format for persistent backend selection.
 */
interface KeyringConfig {
    /** ID of the backend to use by default */
    defaultBackend?: string;
    /** Backend-specific configuration properties */
    backendProperties?: Record<string, Record<string, unknown>>;
}
/**
 * Result from executing a system command.
 */
type CommandResult = {
    /** Exit code from the command */
    code: number;
    /** Standard output from the command */
    stdout: string;
    /** Standard error from the command */
    stderr: string;
};
/**
 * Options for executing system commands.
 */
type CommandOptions = {
    /** Input to pipe to stdin */
    input?: string;
    /** Environment variables for the command */
    env?: NodeJS.ProcessEnv;
    /** Working directory for the command */
    cwd?: string;
    /** Maximum execution time in milliseconds */
    timeoutMs?: number;
};
/**
 * Interface for system command execution utilities.
 * Used by backends to interact with platform-specific tools.
 */
interface RuntimeFunctions {
    /**
     * Executes a system command with arguments.
     *
     * @param command - The command to execute
     * @param args - Command arguments
     * @param options - Execution options
     * @returns Command execution result
     */
    runCommand: (command: string, args: string[], options?: CommandOptions) => Promise<CommandResult>;
    /**
     * Checks if an executable exists in the system PATH.
     *
     * @param command - The command name to check
     * @returns True if the command exists, false otherwise
     */
    executableExists: (command: string) => Promise<boolean>;
    /**
     * Executes a PowerShell script (Windows-specific).
     *
     * @param script - The PowerShell script to execute
     * @param options - Execution options
     * @returns Command execution result
     */
    runPowerShell: (script: string, options?: CommandOptions) => Promise<CommandResult>;
}

declare const runtime: RuntimeFunctions;

/**
 * Registers a custom backend factory with the keyring system.
 * The backend will be added to the list of available backends for automatic detection.
 *
 * @param factory - The backend factory class to register
 *
 * @example
 * ```typescript
 * class CustomBackend extends ConfigurableBackend {
 *   // ... implementation
 * }
 * registerBackend(CustomBackend);
 * ```
 */
declare function registerBackend(factory: BackendFactory): void;
/**
 * Returns all available backends that are supported on the current platform.
 * Backends are instantiated and cached on first call.
 * Unsupported backends are filtered out based on their isSupported() method.
 *
 * @returns Array of all supported backend instances
 */
declare function getAllBackends(): Promise<SecretStorageBackend[]>;
/**
 * Sets the active keyring backend.
 * This overrides automatic backend detection and forces all operations to use this backend.
 *
 * @param backend - The backend instance to use
 */
declare function setKeyring(backend: SecretStorageBackend): void;
/**
 * Returns the currently active keyring backend.
 * If no backend is active, initializes one using automatic detection.
 * Detection order: environment variable, config file, platform detection.
 *
 * @returns The active backend instance
 * @throws {NoKeyringError} If no backend can be initialized
 */
declare function getKeyring(): Promise<SecretStorageBackend>;
/**
 * Initializes the active backend using automatic detection.
 * Detection order: environment variable (TS_KEYRING_BACKEND), config file, platform detection.
 *
 * @param limit - Optional filter function to restrict which backends are allowed
 */
declare function initBackend(limit?: BackendLimit): Promise<void>;

/**
 * Abstract base class for all keyring backends.
 * Provides common functionality for property management, validation, and credential handling.
 * Backends extend this class and implement the core storage operations.
 */
declare abstract class ConfigurableBackend implements SecretStorageBackend {
    abstract readonly id: string;
    abstract readonly name: string;
    abstract readonly priority: number;
    protected readonly properties: Record<string, unknown>;
    /**
     * Creates a new backend instance with optional configuration properties.
     * Properties can be overridden by environment variables prefixed with KEYRING_PROPERTY_.
     *
     * @param properties - Optional configuration properties for this backend
     */
    constructor(properties?: Record<string, unknown>);
    abstract getPassword(service: string, account: string): Promise<string | null>;
    abstract setPassword(service: string, account: string, password: string): Promise<void>;
    abstract deletePassword(service: string, account: string): Promise<void>;
    /**
     * Retrieves a credential (username and password) for a service.
     * If account is specified, retrieves that specific credential.
     * If account is not specified, returns the first credential found for the service.
     *
     * @param service - The service identifier
     * @param account - Optional account/username identifier
     * @returns The credential object, or null if not found
     */
    getCredential(service: string, account?: string | null): Promise<Credential | null>;
    /**
     * Creates a new instance of this backend with merged properties.
     * Useful for runtime configuration changes without recreating the backend registry.
     *
     * @param properties - Properties to merge with the current backend's properties
     * @returns A new backend instance with the merged properties
     */
    withProperties(properties: Record<string, unknown>): SecretStorageBackend;
    /**
     * Returns diagnostic information about this backend.
     * Includes backend ID, name, and priority. Subclasses can override to add more details.
     *
     * @returns Diagnostic information as key-value pairs
     */
    diagnose(): Promise<Record<string, unknown>>;
    protected ensureDir(dir: string): Promise<void>;
    protected applyEnvOverrides(): void;
    protected lookupUsernames(_service: string): Promise<string[]>;
    protected normalizeString(value: string): string;
    protected validateIdentifier(value: string, name: string): void;
    protected validatePassword(password: string): void;
}

/**
 * Backend for macOS Keychain using native bindings via @napi-rs/keyring.
 * This backend provides the best performance and integration with macOS Keychain.
 * Falls back gracefully to CLI-based backend if native module is not available.
 * Has the highest priority among macOS backends.
 */
declare class NativeKeychainBackend extends ConfigurableBackend {
    readonly id = "native-macos";
    readonly name = "Native macOS Keychain";
    readonly priority = 10;
    /**
     * Checks if this backend is supported on the current platform.
     * Requires macOS and the @napi-rs/keyring native module.
     *
     * @returns True if macOS and the native module are available
     */
    static isSupported(): Promise<boolean>;
    /**
     * Retrieves a password from macOS Keychain using native bindings.
     *
     * @param service - The service identifier
     * @param account - The account identifier
     * @returns The stored password, or null if not found
     */
    getPassword(service: string, account: string): Promise<string | null>;
    /**
     * Stores a password in macOS Keychain using native bindings.
     *
     * @param service - The service identifier
     * @param account - The account identifier
     * @param password - The password to store
     */
    setPassword(service: string, account: string, password: string): Promise<void>;
    /**
     * Deletes a password from macOS Keychain using native bindings.
     *
     * @param service - The service identifier
     * @param account - The account identifier
     * @throws {PasswordDeleteError} If the password does not exist
     */
    deletePassword(service: string, account: string): Promise<void>;
    /**
     * Lists all usernames stored for a given service.
     * Uses the @napi-rs/keyring findCredentials API.
     *
     * @param service - The service identifier
     * @returns Array of usernames that have credentials stored for this service
     */
    protected lookupUsernames(service: string): Promise<string[]>;
    /**
     * Returns diagnostic information about this backend.
     * Includes information about the native implementation and fallback availability.
     *
     * @returns Diagnostic information including implementation details
     */
    diagnose(): Promise<Record<string, unknown>>;
}

/**
 * Backend for Windows Credential Manager using native bindings via @napi-rs/keyring.
 * This backend provides the best performance and security by directly accessing the
 * Windows DPAPI through native bindings. Falls back gracefully to PowerShell-based
 * backend if native module is not available. Has the highest priority among Windows backends.
 */
declare class NativeWindowsBackend extends ConfigurableBackend {
    readonly id = "native-windows";
    readonly name = "Native Windows Credential Manager";
    readonly priority = 10;
    /**
     * Checks if this backend is supported on the current platform.
     * Requires Windows and the @napi-rs/keyring native module.
     *
     * @returns True if Windows and the native module are available
     */
    static isSupported(): Promise<boolean>;
    /**
     * Retrieves a password from Windows Credential Manager using native bindings.
     *
     * @param service - The service identifier
     * @param account - The account identifier
     * @returns The stored password, or null if not found
     */
    getPassword(service: string, account: string): Promise<string | null>;
    /**
     * Stores a password in Windows Credential Manager using native bindings.
     *
     * @param service - The service identifier
     * @param account - The account identifier
     * @param password - The password to store
     */
    setPassword(service: string, account: string, password: string): Promise<void>;
    /**
     * Deletes a password from Windows Credential Manager using native bindings.
     *
     * @param service - The service identifier
     * @param account - The account identifier
     * @throws {PasswordDeleteError} If the password does not exist
     */
    deletePassword(service: string, account: string): Promise<void>;
    /**
     * Lists all usernames stored for a given service.
     * Note: The @napi-rs/keyring library does not support credential enumeration.
     *
     * @param _service - The service identifier
     * @returns Empty array (enumeration not supported by native backend)
     */
    protected lookupUsernames(_service: string): Promise<string[]>;
    /**
     * Returns diagnostic information about this backend.
     * Includes information about the native implementation and fallback availability.
     *
     * @returns Diagnostic information including implementation details
     */
    diagnose(): Promise<Record<string, unknown>>;
}

/**
 * Backend for Freedesktop Secret Service using native bindings via @napi-rs/keyring.
 * This backend provides the best performance and security by directly accessing the
 * Secret Service D-Bus API through native bindings. Falls back gracefully to
 * secret-tool based backend if native module is not available.
 * Has the highest priority among Linux backends.
 */
declare class NativeLinuxBackend extends ConfigurableBackend {
    readonly id = "native-linux";
    readonly name = "Native Freedesktop Secret Service";
    readonly priority = 10;
    /**
     * Checks if this backend is supported on the current platform.
     * Requires Linux and the @napi-rs/keyring native module.
     *
     * @returns True if Linux and the native module are available
     */
    static isSupported(): Promise<boolean>;
    /**
     * Retrieves a password from the Secret Service using native bindings.
     *
     * @param service - The service identifier
     * @param account - The account identifier
     * @returns The stored password, or null if not found
     */
    getPassword(service: string, account: string): Promise<string | null>;
    /**
     * Stores a password in the Secret Service using native bindings.
     *
     * @param service - The service identifier
     * @param account - The account identifier
     * @param password - The password to store
     */
    setPassword(service: string, account: string, password: string): Promise<void>;
    /**
     * Deletes a password from the Secret Service using native bindings.
     *
     * @param service - The service identifier
     * @param account - The account identifier
     * @throws {PasswordDeleteError} If the password does not exist
     */
    deletePassword(service: string, account: string): Promise<void>;
    /**
     * Lists all usernames stored for a given service.
     * Note: The @napi-rs/keyring library does not support credential enumeration.
     *
     * @param _service - The service identifier
     * @returns Empty array (enumeration not supported by native backend)
     */
    protected lookupUsernames(_service: string): Promise<string[]>;
    /**
     * Returns diagnostic information about this backend.
     * Includes information about the native implementation and fallback availability.
     *
     * @returns Diagnostic information including implementation details
     */
    diagnose(): Promise<Record<string, unknown>>;
}

/**
 * Backend for macOS Keychain using the `security` command-line tool.
 * Stores credentials in the system keychain using generic password items.
 * Supports custom keychain paths via the `keychain` property.
 */
declare class MacOSKeychainBackend extends ConfigurableBackend {
    readonly id = "macos";
    readonly name = "macOS Keychain (CLI)";
    readonly priority = 5;
    /**
     * Checks if this backend is supported on the current platform.
     * Requires macOS and the `security` command-line tool.
     *
     * @returns True if macOS and security tool are available
     */
    static isSupported(): Promise<boolean>;
    private get keychain();
    /**
     * Retrieves a password from the macOS Keychain.
     * Uses the `security find-generic-password` command.
     *
     * @param service - The service identifier
     * @param account - The account identifier
     * @returns The stored password, or null if not found
     */
    getPassword(service: string, account: string): Promise<string | null>;
    /**
     * Stores a password in the macOS Keychain.
     * Uses the `security add-generic-password` command with the -U flag to update existing entries.
     *
     * @param service - The service identifier
     * @param account - The account identifier
     * @param password - The password to store
     */
    setPassword(service: string, account: string, password: string): Promise<void>;
    /**
     * Deletes a password from the macOS Keychain.
     * Uses the `security delete-generic-password` command.
     *
     * @param service - The service identifier
     * @param account - The account identifier
     * @throws {PasswordDeleteError} If the password does not exist
     */
    deletePassword(service: string, account: string): Promise<void>;
    protected lookupUsernames(service: string): Promise<string[]>;
    /**
     * Returns diagnostic information about this backend.
     * Includes the keychain path being used (or "default" for the system keychain).
     *
     * @returns Diagnostic information including backend details and keychain path
     */
    diagnose(): Promise<Record<string, unknown>>;
    private appendKeychain;
}

/**
 * Backend for Linux Secret Service using the `secret-tool` command.
 * Implements the Freedesktop Secret Service specification.
 * Compatible with GNOME Keyring, KWallet, and other Secret Service implementations.
 * Supports custom application IDs and collection names via properties.
 */
declare class SecretServiceBackend extends ConfigurableBackend {
    readonly id = "secret-service";
    readonly name = "Freedesktop Secret Service";
    readonly priority = 4.8;
    /**
     * Checks if this backend is supported on the current platform.
     * Requires Linux and the `secret-tool` command.
     *
     * @returns True if Linux and secret-tool are available
     */
    static isSupported(): Promise<boolean>;
    private get appId();
    private get collection();
    /**
     * Retrieves a password from the Secret Service.
     * Uses the `secret-tool lookup` command with service, username, and application attributes.
     *
     * @param service - The service identifier
     * @param account - The account identifier
     * @returns The stored password, or null if not found
     */
    getPassword(service: string, account: string): Promise<string | null>;
    /**
     * Stores a password in the Secret Service.
     * Uses the `secret-tool store` command with a descriptive label.
     *
     * @param service - The service identifier
     * @param account - The account identifier
     * @param password - The password to store
     */
    setPassword(service: string, account: string, password: string): Promise<void>;
    /**
     * Deletes a password from the Secret Service.
     * Uses the `secret-tool clear` command.
     *
     * @param service - The service identifier
     * @param account - The account identifier
     * @throws {PasswordDeleteError} If the password does not exist
     */
    deletePassword(service: string, account: string): Promise<void>;
    protected lookupUsernames(service: string): Promise<string[]>;
}

/**
 * Backend for Windows Credential Manager using PowerShell and Windows API.
 * Stores credentials in the Windows Credential Vault as generic credentials.
 * Uses PowerShell with P/Invoke to access the native Windows Credential Manager API.
 */
declare class WindowsCredentialBackend extends ConfigurableBackend {
    readonly id = "windows";
    readonly name = "Windows Credential Manager";
    readonly priority = 5;
    /**
     * Checks if this backend is supported on the current platform.
     * Requires Windows and functional PowerShell.
     *
     * @returns True if Windows and PowerShell are available
     */
    static isSupported(): Promise<boolean>;
    /**
     * Retrieves a password from Windows Credential Manager.
     * Uses PowerShell to call CredRead from the Windows API.
     *
     * @param service - The service identifier
     * @param account - The account identifier
     * @returns The stored password, or null if not found
     */
    getPassword(service: string, account: string): Promise<string | null>;
    /**
     * Stores a password in Windows Credential Manager.
     * Uses PowerShell to call CredWrite from the Windows API.
     *
     * @param service - The service identifier
     * @param account - The account identifier
     * @param password - The password to store
     */
    setPassword(service: string, account: string, password: string): Promise<void>;
    /**
     * Deletes a password from Windows Credential Manager.
     * Uses PowerShell to call CredDelete from the Windows API.
     *
     * @param service - The service identifier
     * @param account - The account identifier
     * @throws {PasswordDeleteError} If the password does not exist
     */
    deletePassword(service: string, account: string): Promise<void>;
    private buildTarget;
    /**
     *
     */
    diagnose(): Promise<Record<string, unknown>>;
    private get persistence();
    private validatePersistence;
}

/**
 * A backend that stores secrets in an encrypted local file.
 * Uses AES-256-GCM for authenticated encryption with a randomly generated key.
 * The encryption key is stored in a separate file with 0600 permissions.
 * This backend serves as a fallback when native platform keychains are unavailable.
 */
declare class FileSystemBackend extends ConfigurableBackend {
    readonly id = "file";
    readonly name = "Encrypted file storage (AES-256-GCM)";
    readonly priority = 0.5;
    private get filePath();
    private get keyFilePath();
    private getKeyMaterial;
    private encryptStore;
    private decryptStore;
    /**
     * Retrieves a password from the encrypted file store.
     *
     * @param service - The service identifier
     * @param account - The account identifier
     * @returns The stored password, or null if not found
     */
    getPassword(service: string, account: string): Promise<string | null>;
    /**
     * Stores a password in the encrypted file store.
     * Creates the storage file and encryption key if they don't exist.
     *
     * @param service - The service identifier
     * @param account - The account identifier
     * @param password - The password to store
     */
    setPassword(service: string, account: string, password: string): Promise<void>;
    /**
     * Deletes a password from the encrypted file store.
     *
     * @param service - The service identifier
     * @param account - The account identifier
     * @throws {PasswordDeleteError} If the password does not exist
     */
    deletePassword(service: string, account: string): Promise<void>;
    protected lookupUsernames(service: string): Promise<string[]>;
    private readStore;
    private atomicWrite;
    private writeStore;
}

/**
 * A no-op backend that does not store any credentials.
 * Used when credential storage needs to be explicitly disabled.
 * All get operations return null, set operations succeed silently, and delete operations throw errors.
 * This backend has a negative priority so it's only used when explicitly configured.
 */
declare class NullBackend extends ConfigurableBackend {
    readonly id = "null";
    readonly name = "Null keyring";
    readonly priority = -1;
    /**
     * Always returns null, as no credentials are stored.
     *
     * @param _service - The service identifier (unused)
     * @param _account - The account identifier (unused)
     * @returns Always returns null
     */
    getPassword(_service: string, _account: string): Promise<string | null>;
    /**
     * Silently succeeds without storing anything.
     *
     * @param _service - The service identifier (unused)
     * @param _account - The account identifier (unused)
     * @param _password - The password (unused)
     */
    setPassword(_service: string, _account: string, _password: string): Promise<void>;
    /**
     * Always throws an error, as there are no stored credentials to delete.
     *
     * @param _service - The service identifier (unused)
     * @param _account - The account identifier (unused)
     * @throws {PasswordDeleteError} Always thrown since no passwords are stored
     */
    deletePassword(_service: string, _account: string): Promise<void>;
}

/**
 *
 */
declare class KeyringError extends Error {
}
/**
 *
 */
declare class PasswordSetError extends KeyringError {
}
/**
 *
 */
declare class PasswordDeleteError extends KeyringError {
}
/**
 *
 */
declare class InitError extends KeyringError {
}
/**
 *
 */
declare class KeyringLockedError extends KeyringError {
}
/**
 *
 */
declare class NoKeyringError extends KeyringError {
}

interface TestingExports {
    runCommand: typeof runtime.runCommand;
    executableExists: typeof runtime.executableExists;
    runPowerShell: typeof runtime.runPowerShell;
    NativeKeychainBackend: typeof NativeKeychainBackend;
    NativeWindowsBackend: typeof NativeWindowsBackend;
    NativeLinuxBackend: typeof NativeLinuxBackend;
    MacOSKeychainBackend: typeof MacOSKeychainBackend;
    SecretServiceBackend: typeof SecretServiceBackend;
    WindowsCredentialBackend: typeof WindowsCredentialBackend;
    FileSystemBackend: typeof FileSystemBackend;
    NullBackend: typeof NullBackend;
}
declare const __testing: TestingExports;

/**
 * Returns the root directory where keyring data is stored.
 * This is typically platform-specific (e.g., ~/.local/share/cross-keychain on Linux).
 *
 * @returns The absolute path to the data root directory
 */
declare function dataRoot(): string;
/**
 * Returns the root directory where keyring configuration is stored.
 * This is typically platform-specific (e.g., ~/.config/cross-keychain on Linux).
 *
 * @returns The absolute path to the config root directory
 */
declare function configRoot(): string;
/**
 * Retrieves a password from the keyring.
 * This is the primary method for reading stored credentials.
 *
 * @param service - The service identifier (e.g., "github", "npm")
 * @param account - The account/username identifier
 * @returns The stored password, or null if not found
 *
 * @example
 * ```typescript
 * const password = await getPassword("github", "myusername");
 * if (password) {
 *   console.log("Password found!");
 * }
 * ```
 */
declare function getPassword(service: string, account: string): Promise<string | null>;
/**
 * Stores a password in the keyring.
 * If a password already exists for the service/account combination, it will be updated.
 *
 * @param service - The service identifier (e.g., "github", "npm")
 * @param account - The account/username identifier
 * @param password - The password to store
 *
 * @example
 * ```typescript
 * await setPassword("github", "myusername", "secret123");
 * ```
 */
declare function setPassword(service: string, account: string, password: string): Promise<void>;
/**
 * Deletes a password from the keyring.
 * Throws an error if the password does not exist.
 *
 * @param service - The service identifier
 * @param account - The account/username identifier
 *
 * @example
 * ```typescript
 * await deletePassword("github", "myusername");
 * ```
 */
declare function deletePassword(service: string, account: string): Promise<void>;
/**
 * Retrieves a credential (username and password) from the keyring.
 * If account is not specified, returns the first credential found for the service.
 *
 * @param service - The service identifier
 * @param account - Optional account/username identifier
 * @returns The credential object with username and password, or null if not found
 *
 * @example
 * ```typescript
 * // Get specific credential
 * const cred = await getCredential("github", "myusername");
 *
 * // Get any credential for the service
 * const anyCred = await getCredential("github");
 * ```
 */
declare function getCredential(service: string, account?: string | null): Promise<Credential | null>;
/**
 * Disables credential storage by configuring the null backend.
 * Creates a configuration file that prevents any credentials from being stored.
 * Throws an error if a configuration file already exists.
 */
declare function disable(): Promise<void>;
/**
 * Returns diagnostic information about the current keyring configuration.
 * Useful for debugging and troubleshooting keyring issues.
 *
 * @returns An object containing configuration paths, active backend info, and platform details
 *
 * @example
 * ```typescript
 * const info = await diagnose();
 * console.log("Active backend:", info.name);
 * console.log("Config path:", info.configPath);
 * ```
 */
declare function diagnose(): Promise<Record<string, unknown>>;
/**
 * Resets all keyring state for testing purposes.
 * Internal function used by the test suite to ensure test isolation.
 */
declare function __resetKeyringStateForTests(): void;
/**
 * Lists all available keyring backends with their metadata.
 * Includes backend ID, name, and priority for each detected backend.
 *
 * @returns Array of backend information objects
 *
 * @example
 * ```typescript
 * const backends = await listBackends();
 * backends.forEach(b => {
 *   console.log(`${b.id}: ${b.name} (priority: ${b.priority})`);
 * });
 * ```
 */
declare function listBackends(): Promise<BackendInfo[]>;
/**
 * Forces the use of a specific backend by ID.
 * Useful for testing or when you want to use a specific storage mechanism.
 * Throws an error if the backend is not available.
 *
 * @param backendId - The ID of the backend to use (e.g., "macos", "file", "null")
 * @param overrides - Optional configuration properties for the backend
 *
 * @example
 * ```typescript
 * // Use file backend with custom path
 * await useBackend("file", { file_path: "/custom/path/secrets.json" });
 * ```
 */
declare function useBackend(backendId: string, overrides?: Record<string, unknown>): Promise<void>;

export { InitError, KeyringError, KeyringLockedError, NoKeyringError, PasswordDeleteError, PasswordSetError, __resetKeyringStateForTests, __testing, configRoot, dataRoot, deletePassword, diagnose, disable, getAllBackends, getCredential, getKeyring, getPassword, initBackend, listBackends, registerBackend, setKeyring, setPassword, useBackend };
export type { BackendFactory, BackendInfo, BackendLimit, CommandOptions, CommandResult, Credential, KeyringConfig, RuntimeFunctions, SecretStorageBackend };
