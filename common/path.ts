import path from "path";

const PROJECT_ROOT = process.env.PROJECT_ROOT
const PROJECT_DIR = process.env.PROJECT_DIR
const DIST_DIR = process.env.DIST_DIR
const PROCESS_DIR = process.env.PROCESS_DIR
const WEB_DIR = process.env.WEB_DIR
const LOG_DIR = process.env.LOG_DIR

const STATIC_CONTENT_DIR = process.env.STATIC_CONTENT_DIR
const STATIC_DATA_DIR = process.env.STATIC_DATA_DIR
const CERTS_RELATIVE_PATH = process.env.CERTS_RELATIVE_PATH
const PROJECT_PATH = path.join(PROJECT_ROOT!, PROJECT_DIR!)

export const LOG_PATH = path.join(PROJECT_PATH, LOG_DIR!)
export const DIST_PATH = path.join(PROJECT_PATH, DIST_DIR!)
export const PROCESS_PATH = path.join(DIST_PATH, PROCESS_DIR!)
export const WEB_ROOT_PATH = path.join(DIST_PATH, WEB_DIR!)
export const STATIC_CONTENT_PATH = path.join(WEB_ROOT_PATH, STATIC_CONTENT_DIR!)
export const STATIC_DATA_PATH = path.join(STATIC_CONTENT_PATH, STATIC_DATA_DIR!)
export const DB_RELATIVE_FILEPATH = process.env.DB_RELATIVE_FILEPATH
export const CERTS_PATH = path.join(PROJECT_ROOT!, CERTS_RELATIVE_PATH!)