import React from "react";
import Container from "../common/Container";

export default function Footer() {
  return (
    <footer className="border-t">
      <Container className="py-8 text-sm text-gray-600">
        <div className="flex flex-col md:flex-row md:justify-between gap-4">
          <div>© {new Date().getFullYear()} Ventry — Built with care.</div>
          <div className="flex gap-4">
            <a href="#">Terms</a>
            <a href="#">Privacy</a>
          </div>
        </div>
      </Container>
    </footer>
  );
}
