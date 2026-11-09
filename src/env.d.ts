declare namespace App {
  interface Locals {
    /**
     * Set by src/middleware.ts before it shows the 503 page: the path and query of the page that
     * failed, for the page's "try again" link.
     */
    retryPath?: string;
  }
}
