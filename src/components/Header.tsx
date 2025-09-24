// src/components/Header.tsx
import React from "react";
import { Github, BookOpen } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

const API_DOCS_URL = "https://dcewm-api.hcfmike040210.workers.dev/docs";
const GITHUB_URL   = "https://github.com/Mikey-He/dcewm-frontend";

export const Header: React.FC = () => {
  return (
    <header className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Data Center Energy and Water Monitor
          </h1>
          <span className="text-xs font-mono bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5">
            DCEWM
          </span>
        </div>
        <nav className="flex items-center gap-3">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
            title="Open GitHub repository"
          >
            <Github size={16} />
            GitHub
          </a>
          <a
            href={API_DOCS_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
            title="Open API Docs"
          >
            <BookOpen size={16} />
            API Docs
          </a>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
};
