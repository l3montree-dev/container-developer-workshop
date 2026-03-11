{
  description = "Container Developer Workshop — prerequisites shell";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "x86_64-darwin" "aarch64-darwin" ];

      forAllSystems = nixpkgs.lib.genAttrs systems;

      chw = { pkgs }:
        let
          version = "1.1.0-rc.1";
          baseUrl = "https://gitlab.opencode.de/oci-community/tools/container-hardening-work-bench/-/releases/v${version}/downloads";

          assets = {
            "x86_64-linux" = {
              url = "${baseUrl}/container-hardening-work-bench_${version}_linux_amd64.tar.gz";
              hash = "sha256-R1glAF6CdqH/qRCf9imQm/ZghnpecVPwLdiM8rQzPho=";
            };
            "aarch64-linux" = {
              url = "${baseUrl}/container-hardening-work-bench_${version}_linux_arm64.tar.gz";
              hash = "sha256-+FQ7ScF94HMMCPhSy+ovvISa668exqdGXSWhvc8Xaiw=";
            };
            "x86_64-darwin" = {
              url = "${baseUrl}/container-hardening-work-bench_${version}_darwin_amd64.tar.gz";
              hash = "sha256-XD5273lPwwdGqmuYujMv5kIBztUMVqHURrUkVL1kKsU=";
            };
            "aarch64-darwin" = {
              url = "${baseUrl}/container-hardening-work-bench_${version}_darwin_arm64.tar.gz";
              hash = "sha256-AdeIcM6EqphfbAOxYmqEf923s9iQg0dfbc6T8KMMs+I=";
            };
          };

          asset = assets.${pkgs.stdenv.system};
        in
        pkgs.stdenv.mkDerivation {
          pname = "container-hardening-work-bench";
          inherit version;

          src = pkgs.fetchurl {
            url = asset.url;
            hash = asset.hash;
          };

          sourceRoot = ".";

          installPhase = ''
            install -Dm755 container-hardening-work-bench $out/bin/container-hardening-work-bench
          '';

          meta = {
            description = "Tools for container hardening: inspect image filesystems, generate minimal Containerfiles, run Devguard scans";
            homepage = "https://gitlab.opencode.de/oci-community/tools/container-hardening-work-bench";
            mainProgram = "container-hardening-work-bench";
          };
        };

    in
    {
      packages = forAllSystems (system:
        let pkgs = nixpkgs.legacyPackages.${system}; in
        {
          container-hardening-work-bench = chw { inherit pkgs; };
          default = chw { inherit pkgs; };
        }
      );

      devShells = forAllSystems (system:
        let pkgs = nixpkgs.legacyPackages.${system}; in
        {
          default = pkgs.mkShell {
            packages = [
              pkgs.docker-client
              pkgs.jq
              pkgs.trivy
              pkgs.bun
              pkgs.netcat-gnu
              pkgs.gnutar
              (chw { inherit pkgs; })
            ] ++ pkgs.lib.optionals pkgs.stdenv.isLinux [
              # namespace demo tools (Linux only — these syscalls don't exist on macOS)
              pkgs.util-linux   # unshare, nsenter, lsns
              pkgs.shadow       # newuidmap, newgidmap
              pkgs.go           # compile setuid-demo
            ];

            shellHook = ''
              echo "Workshop prerequisites ready"
              container-hardening-work-bench --help
            '';
          };
        }
      );
    };
}
