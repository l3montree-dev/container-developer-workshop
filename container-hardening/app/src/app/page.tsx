export default function HomePage() {
  return (
    <main
      style={{
        maxWidth: "800px",
        margin: "2rem auto",
        padding: "0 1rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <header>
        <h1>React2Shell – Vulnerable PoC Stack</h1>
        <p>
          This Next.js application intentionally uses vulnerable React Server Components (RSC) and Next.js
          versions in order to test how well security scanners can detect the related Remote Code Execution (RCE)
          vulnerabilities.
        </p>
      </header>

      <section style={{ marginTop: "2rem" }}>
        <h2>Affected Vulnerabilities</h2>
        <ul>
          <li>
            <strong>
              <a
                href="https://nvd.nist.gov/vuln/detail/CVE-2025-55182"
                target="_blank"
                rel="noopener noreferrer"
              >
                CVE-2025-55182
              </a>
            </strong>{" "}
            – React Server Components “Flight” protocol unsafe deserialization.
          </li>
          <li>
            <strong>
              <a
                href="https://nextjs.org/blog/CVE-2025-66478"
                target="_blank"
                rel="noopener noreferrer"
              >
                CVE-2025-66478
              </a>
            </strong>{" "}
            – Tracks the downstream impact on Next.js applications using the App Router.
          </li>
        </ul>
      </section>

      <section style={{ marginTop: "1.5rem" }}>
        <h2>Environment purpose</h2>
        <p>
          This container is designed for:
        </p>
        <ul>
          <li>Testing SCA and container scanners against known-vulnerable React / Next.js RSC versions</li>
          <li>Reproducing detection rules and signatures in a controlled lab</li>
          <li>Exploiting and learning about React2Shell in a controlled environment</li>
        </ul>
        <p
          style={{
            marginTop: "0.75rem",
            color: "#b00020",
            fontWeight: "bold",
          }}
        >
          Do not expose this container to the public internet, do not use it with real user data, and do not
          deploy it in production.
        </p>
      </section>

      <section style={{ marginTop: "1.5rem" }}>
        <h2>Key vulnerable components</h2>
        <ul>
          <li>
            React RSC packages:
            <ul>
              <li>
                <code>react-server-dom-webpack</code> 19.0.0 / 19.1.0 / 19.1.1 / 19.2.0
              </li>
              <li>
                <code>react-server-dom-parcel</code> 19.0.0 / 19.1.0 / 19.1.1 / 19.2.0
              </li>
              <li>
                <code>react-server-dom-turbopack</code> 19.0.0 / 19.1.0 / 19.1.1 / 19.2.0
              </li>
            </ul>
          </li>
          <li>
            Next.js:
            <ul>
              <li>All stable 15.x</li>
              <li>All stable 16.x (prior to patched 16.0.7)</li>
              <li>Canary builds from 14.3.0-canary.77 and above</li>
            </ul>
          </li>
        </ul>
      </section>

      <section style={{ marginTop: "1.5rem" }}>
        <h2>References</h2>
        <ul>
          <li>
            Snyk / DEV post:{" "}
            <a
              href="https://dev.to/snyk/security-advisory-critical-rce-vulnerabilities-in-react-server-components-nextjs-3lef"
              target="_blank"
              rel="noreferrer"
            >
              Security Advisory: Critical RCE Vulnerabilities in React Server Components &amp; Next.js
            </a>
          </li>
          <li>
            Snyk advisory – <code>react-server-dom-webpack</code>:{" "}
            <a
              href="https://security.snyk.io/vuln/SNYK-JS-REACTSERVERDOMWEBPACK-14173285"
              target="_blank"
              rel="noreferrer"
            >
              SNYK-JS-REACTSERVERDOMWEBPACK-14173285
            </a>
          </li>
          <li>
            Snyk advisory – <code>react-server-dom-turbopack</code>:{" "}
            <a
              href="https://security.snyk.io/vuln/SNYK-JS-REACTSERVERDOMTURBOPACK-14173287"
              target="_blank"
              rel="noreferrer"
            >
              SNYK-JS-REACTSERVERDOMTURBOPACK-14173287
            </a>
          </li>
          <li>
            Snyk advisory – <code>react-server-dom-parcel</code>:{" "}
            <a
              href="https://security.snyk.io/vuln/SNYK-JS-REACTSERVERDOMPARCEL-14173286"
              target="_blank"
              rel="noreferrer"
            >
              SNYK-JS-REACTSERVERDOMPARCEL-14173286
            </a>
          </li>
          <li>
            Snyk advisory – Next.js RSC integration:{" "}
            <a
              href="https://security.snyk.io/vuln/SNYK-JS-NEXT-14173355"
              target="_blank"
              rel="noreferrer"
            >
              SNYK-JS-NEXT-14173355
            </a>
          </li>

          {/* Additional CVE focused references */}
          <li>
            React blog – Critical Security Vulnerability in React Server Components (CVE-2025-55182):{" "}
            <a
              href="https://react.dev/blog/2025/12/03/critical-security-vulnerability-in-react-server-components"
              target="_blank"
              rel="noreferrer"
            >
              Critical Security Vulnerability in React Server Components
            </a>
          </li>
          <li>
            NVD entry – React RSC RCE (CVE-2025-55182):{" "}
            <a
              href="https://nvd.nist.gov/vuln/detail/CVE-2025-55182"
              target="_blank"
              rel="noreferrer"
            >
              CVE-2025-55182
            </a>
          </li>
          <li>
            Next.js security advisory – CVE-2025-66478:{" "}
            <a
              href="https://nextjs.org/blog/CVE-2025-66478"
              target="_blank"
              rel="noreferrer"
            >
              Security Advisory: CVE-2025-66478
            </a>
          </li>
          <li>
            NVD entry – Next.js RSC impact (CVE-2025-66478):{" "}
            <a
              href="https://nvd.nist.gov/vuln/detail/CVE-2025-66478"
              target="_blank"
              rel="noreferrer"
            >
              CVE-2025-66478
            </a>
          </li>
        </ul>
      </section>

      <footer
        style={{
          marginTop: "2rem",
          paddingTop: "1rem",
          borderTop: "1px solid #e0e0e0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "0.9rem",
        }}
      >
        <a
          href="https://github.com/l4rm4nd/CVE-2025-55182"
          target="_blank"
          rel="noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            textDecoration: "none",
            color: "inherit",
            fontWeight: 500,
          }}
          aria-label="View the CVE-2025-55182 PoC repository on GitHub"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            role="img"
            aria-hidden="true"
          >
            <path
              fill="currentColor"
              d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577
                 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61
                 C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729
                 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998
                 .108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93
                 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176
                 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405
                 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23
                 .645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22
                 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22
                 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57
                 C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
            />
          </svg>
          <span style={{ marginLeft: "0.5rem" }}>CVE-2025-55182 PoC on GitHub</span>
        </a>

        <div>
          <span>
            Provided by{" "}
            <a
              href="https://github.com/l4rm4nd"
              target="_blank"
              rel="noreferrer"
              style={{ fontWeight: 600 }}
            >
              LRVT
            </a>
          </span>
        </div>
      </footer>
    </main>
  );
}