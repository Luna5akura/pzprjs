{ pkgs ? import <nixpkgs> {} }:
pkgs.mkShell {
  buildInputs = with pkgs; [
    nodejs_22
    gnumake
    entr
    concurrently
    rustup
    wasm-pack
    cargo
    rustc
  ];
}
