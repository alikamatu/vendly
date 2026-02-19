"use client";
import React from "react";
import Container from "../common/Container";

export default function Footer() {
  return (
    <footer className="border-t">
      <Container className="py-6 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex justify-between">
          <div>© {new Date().getFullYear()} Admin</div>
          <div>v{process.env.NEXT_PUBLIC_VERSION || "0.1.0"}</div>
        </div>
      </Container>
    </footer>
  );
}
