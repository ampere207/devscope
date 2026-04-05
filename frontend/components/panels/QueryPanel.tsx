"use client";

import { useMemo, useState } from "react";

import type { GraphEdge } from "@/lib/api/types";

interface QueryPanelProps {
  selectedNodeId: string | null;
  edges: GraphEdge[];
  onHighlightNodes: (nodes: string[]) => void;
}

function normalize(text: string) {
  return text.toLowerCase().trim();
}

export function QueryPanel({ selectedNodeId, edges, onHighlightNodes }: QueryPanelProps) {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("Ask a question to reason about dependencies.");

  const suggestions = useMemo(
    () => [
      "What depends on payment-service?",
      "Which services depend on database?",
      "What breaks if auth-service fails?",
    ],
    [],
  );

  function resolveQuery(input: string) {
    const normalized = normalize(input);
    if (!normalized) {
      setAnswer("Ask a question to reason about dependencies.");
      onHighlightNodes([]);
      return;
    }

    const allNodes = new Set<string>();
    edges.forEach((edge) => {
      allNodes.add(edge.source);
      allNodes.add(edge.target);
    });

    const matchedNode = [...allNodes].find((node) => normalized.includes(normalize(node)));
    if (!matchedNode) {
      setAnswer("No direct node match found in the current graph. Try a node name from the sidebar.");
      onHighlightNodes([]);
      return;
    }

    const dependents = edges.filter((edge) => edge.target === matchedNode).map((edge) => edge.source);
    const dependencies = edges.filter((edge) => edge.source === matchedNode).map((edge) => edge.target);

    if (normalized.includes("depends on") || normalized.includes("depend on")) {
      onHighlightNodes([matchedNode, ...dependents]);
      setAnswer(
        dependents.length
          ? `${dependents.join(", ")} depend on ${matchedNode}.`
          : `No nodes currently depend on ${matchedNode}.`,
      );
      return;
    }

    if (normalized.includes("break") || normalized.includes("impact") || normalized.includes("affected")) {
      onHighlightNodes([matchedNode, ...dependencies]);
      setAnswer(
        dependencies.length
          ? `If ${matchedNode} changes, likely impacted nodes include ${dependencies.join(", ")}.`
          : `${matchedNode} has no downstream links in the current graph.`,
      );
      return;
    }

    onHighlightNodes([matchedNode, ...dependents, ...dependencies]);
    setAnswer(
      `${matchedNode} has ${dependents.length} dependents and ${dependencies.length} downstream dependencies.`,
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Ask about your system</label>
        <textarea
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          rows={3}
          className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none ring-cyan-200 transition focus:ring-4"
          placeholder="What breaks if auth-service fails?"
        />
      </div>

      <button
        type="button"
        onClick={() => resolveQuery(query)}
        className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
      >
        Run Query
      </button>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">{answer}</div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Examples</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                setQuery(suggestion);
                resolveQuery(suggestion);
              }}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {selectedNodeId ? (
        <p className="text-xs text-slate-500">Selected node context: {selectedNodeId}</p>
      ) : null}
    </div>
  );
}
