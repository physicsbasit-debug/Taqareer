(() => {
  "use strict";

  const VERSION = "1.0.0";
  const HIGH_CONFIDENCE = 0.85;

  function normalize(value) {
    return String(value ?? "")
      .trim()
      .replace(/[\u200e\u200f\u202a-\u202e]/g, " ")
      .replace(/ـ/g, "")
      .replace(/[إأآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  function normalizeDigits(value) {
    const map = {"٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9","٫":".","٬":""};
    return String(value ?? "").replace(/[٠-٩٫٬]/g, char => map[char]);
  }

  function clean(value) {
    return String(value ?? "").replace(/[|]+/g, " ").replace(/\s+/g, " ").trim();
  }

  function lineText(line) { return clean(line?.text || ""); }
  function lineCells(line) {
    return (Array.isArray(line?.cells) ? line.cells : []).map(clean).filter(Boolean);
  }

  function parseNumber(value) {
    const text = normalizeDigits(clean(value)).replace(/%/g, "").replace(/,/g, "");
    if (!/^[-+]?\d+(?:\.\d+)?$/.test(text)) return NaN;
    const number = Number(text);
    return Number.isFinite(number) ? number : NaN;
  }

  function isPercentage(value) {
    const raw = normalizeDigits(clean(value));
    return /%/.test(raw) && Number.isFinite(parseNumber(raw));
  }

  function makeUnique(values) {
    const counts = new Map();
    return values.map((value, index) => {
      const base = clean(value) || `حقل ${index + 1}`;
      const key = normalize(base);
      const count = (counts.get(key) || 0) + 1;
      counts.set(key, count);
      return count === 1 ? base : `${base} (${count})`;
    });
  }

  function repeatedPatternScore(values, width) {
    if (!values.length || width < 1 || values.length % width !== 0) return 0;
    const base = values.slice(0, width).map(normalize);
    if (!base.every(Boolean)) return 0;
    let equal = 0;
    let total = 0;
    for (let offset = 0; offset < values.length; offset += width) {
      const group = values.slice(offset, offset + width).map(normalize);
      for (let index = 0; index < width; index += 1) {
        total += 1;
        if (group[index] === base[index]) equal += 1;
      }
    }
    return total ? equal / total : 0;
  }

  function inferHierarchicalHeader(lines, index) {
    const parentLine = lines?.[index];
    const childLine = lines?.[index + 1];
    if (!parentLine || !childLine) return null;
    const parents = lineCells(parentLine);
    const children = lineCells(childLine);
    if (parents.length < 3 || children.length <= parents.length) return null;
    if (children.length > 40 || parents.length > 20) return null;

    let best = null;
    for (let leading = 1; leading <= Math.min(3, parents.length - 1); leading += 1) {
      const parentGroups = parents.length - leading;
      const childSlots = children.length - leading;
      if (parentGroups < 2 || childSlots < parentGroups * 2 || childSlots % parentGroups !== 0) continue;
      const width = childSlots / parentGroups;
      if (width < 2 || width > 5) continue;
      const repeated = repeatedPatternScore(children.slice(leading), width);
      if (repeated < 0.72) continue;
      const parentDistinct = new Set(parents.slice(leading).map(normalize).filter(Boolean)).size;
      if (parentDistinct < Math.max(2, Math.ceil(parentGroups * 0.55))) continue;
      const confidence = Math.min(0.99, 0.78 + repeated * 0.14 + Math.min(0.06, parentGroups * 0.01));
      const candidate = { leading, width, repeated, confidence };
      if (!best || candidate.confidence > best.confidence) best = candidate;
    }
    if (!best) return null;

    const leadingHeaders = children.slice(0, best.leading);
    const parentHeaders = parents.slice(best.leading);
    const childGroups = parentHeaders.map((parent, groupIndex) => ({
      parent,
      children: children.slice(best.leading + groupIndex * best.width, best.leading + (groupIndex + 1) * best.width),
    }));
    const collapsedHeaders = makeUnique([...leadingHeaders, ...parentHeaders]);
    const leafHeaders = makeUnique([
      ...leadingHeaders,
      ...childGroups.flatMap(group => group.children.map(child => `${group.parent} · ${child}`)),
    ]);

    return {
      startIndex: index,
      endHeaderIndex: index + 1,
      leadingCount: best.leading,
      childWidth: best.width,
      parentLine,
      childLine,
      parentCells: parents,
      childCells: children,
      leadingHeaders,
      parentHeaders,
      childGroups,
      collapsedHeaders,
      leafHeaders,
      expectedLeafCellCount: children.length,
      expectedNumericLeafCount: children.length - best.leading,
      confidence: best.confidence,
    };
  }

  const TOTAL_RE = /^(?:الاجمالي|الإجمالي|المجموع|المجموع الكلي|المجموع العام|الجمله|الجملة|جمله|جملة|جمله عامه|جملة عامة|grand total|total)$/;
  const GRAND_TOTAL_RE = /^(?:جمله عامه|جملة عامة|المجموع العام|المجموع الكلي|grand total)$/;

  function rowRole(label) {
    const value = normalize(label);
    if (GRAND_TOTAL_RE.test(value)) return "grand_total";
    if (TOTAL_RE.test(value)) return "total";
    return "detail";
  }

  function percentageOnlyRow(line) {
    const cells = lineCells(line);
    if (!cells.length) return false;
    const percentCells = cells.filter(isPercentage);
    const nonPercentNumeric = cells.filter(value => Number.isFinite(parseNumber(value)) && !isPercentage(value));
    const textual = cells.filter(value => /[A-Za-z\u0600-\u06ff]/.test(value) && !isPercentage(value));
    return percentCells.length >= 2 && nonPercentNumeric.length === 0 && textual.length === 0;
  }

  function rowFromHierarchicalCells(line, spec) {
    const cells = lineCells(line);
    if (!cells.length || percentageOnlyRow(line)) return null;
    const expected = spec.expectedLeafCellCount;
    if (cells.length !== expected) return null;

    const leadingValues = cells.slice(0, spec.leadingCount);
    const leafValues = cells.slice(spec.leadingCount);
    const numericLeafValues = leafValues.map(parseNumber);
    const numericCount = numericLeafValues.filter(Number.isFinite).length;
    if (numericCount < Math.max(2, Math.ceil(leafValues.length * 0.75))) return null;
    if (leadingValues.every(value => Number.isFinite(parseNumber(value)))) return null;

    const row = {};
    spec.leadingHeaders.forEach((header, index) => { row[spec.collapsedHeaders[index]] = leadingValues[index] ?? ""; });
    const leafBreakdown = {};
    let cursor = 0;
    spec.childGroups.forEach((group, groupIndex) => {
      const values = leafValues.slice(cursor, cursor + spec.childWidth);
      cursor += spec.childWidth;
      const numeric = values.map(parseNumber).filter(Number.isFinite);
      const parentHeader = spec.collapsedHeaders[spec.leadingCount + groupIndex];
      row[parentHeader] = numeric.length ? String(numeric.reduce((sum, value) => sum + value, 0)) : "";
      leafBreakdown[parentHeader] = Object.fromEntries(group.children.map((child, childIndex) => [child, values[childIndex] ?? ""]));
    });

    const label = leadingValues.map(clean).filter(Boolean).join(" · ");
    return {
      row,
      meta: {
        role: rowRole(label),
        sourceLabel: label,
        page: null,
        line: line?.lineIndex || null,
        leafBreakdown,
        percentageCells: [],
      },
    };
  }

  function aggregateSignature(row, headers, leadingCount) {
    const values = headers.slice(leadingCount).map(header => {
      const number = parseNumber(row?.[header]);
      return Number.isFinite(number) ? number : null;
    });
    return values.some(value => value !== null) ? JSON.stringify(values) : "";
  }

  function additiveConsistency(rows, spec) {
    if (!Array.isArray(rows) || !rows.length || spec.parentHeaders.length < 3) return null;
    const parentHeaders = spec.collapsedHeaders.slice(spec.leadingCount);
    const totalHeader = parentHeaders.at(-1);
    const detailHeaders = parentHeaders.slice(0, -1);
    let checked = 0;
    let matched = 0;
    for (const row of rows) {
      const total = parseNumber(row?.[totalHeader]);
      const parts = detailHeaders.map(header => parseNumber(row?.[header]));
      if (!Number.isFinite(total) || parts.filter(Number.isFinite).length < 2) continue;
      const sum = parts.filter(Number.isFinite).reduce((output, value) => output + value, 0);
      checked += 1;
      const tolerance = Math.max(1e-6, Math.abs(total) * 1e-6);
      if (Math.abs(sum - total) <= tolerance) matched += 1;
    }
    return checked ? matched / checked : null;
  }

  function discoverPageSegment(page, lines, index) {
    const spec = inferHierarchicalHeader(lines, index);
    if (!spec) return null;
    const rows = [];
    const rowMeta = [];
    const percentageRows = [];
    let endIndex = spec.endHeaderIndex;
    let misses = 0;

    for (let cursor = spec.endHeaderIndex + 1; cursor < lines.length; cursor += 1) {
      const line = lines[cursor];
      if (!lineText(line)) continue;
      if (inferHierarchicalHeader(lines, cursor)) break;
      if (percentageOnlyRow(line)) {
        if (rowMeta.length) {
          const values = lineCells(line);
          rowMeta[rowMeta.length - 1].percentageCells = values;
          percentageRows.push({ page: page.pageNumber, line: line?.lineIndex || null, values });
          endIndex = cursor;
          misses = 0;
          continue;
        }
      }
      const parsed = rowFromHierarchicalCells(line, spec);
      if (parsed) {
        parsed.meta.page = page.pageNumber;
        rows.push(parsed.row);
        rowMeta.push(parsed.meta);
        endIndex = cursor;
        misses = 0;
      } else {
        misses += 1;
        if (rows.length && misses >= 2) break;
      }
    }

    if (!rows.length) return null;
    const consistency = additiveConsistency(rows, spec);
    const consistencyAdjustment = consistency === null ? 0 : consistency >= 0.67 ? 0.04 : -0.16;
    const confidence = Math.max(0, Math.min(0.99, spec.confidence + Math.min(0.05, rows.length * 0.012) + consistencyAdjustment));
    const accepted = confidence >= HIGH_CONFIDENCE && (consistency === null || consistency >= 0.67);
    const status = consistency !== null && consistency < 0.67 ? "unresolved" : accepted ? "accepted" : "review";
    return {
      headers: spec.collapsedHeaders,
      rows,
      rowMeta,
      confidence,
      status,
      pages: [page.pageNumber],
      sourceText: lines.slice(index, endIndex + 1).map(lineText).filter(Boolean).join("\n"),
      provenance: {
        header: { page: page.pageNumber, line: spec.parentLine?.lineIndex || null, sourceText: lineText(spec.parentLine), confidence: spec.confidence },
        startLine: spec.parentLine?.lineIndex || index + 1,
        endLine: lines[endIndex]?.lineIndex || endIndex + 1,
      },
      structure: {
        kind: "hierarchical-table",
        version: VERSION,
        leadingHeaders: spec.leadingHeaders,
        parentHeaders: spec.parentHeaders,
        childGroups: spec.childGroups,
        leafHeaders: spec.leafHeaders,
        childWidth: spec.childWidth,
        measureProjection: "sum-numeric-child-columns",
        additiveConsistency: consistency,
        percentageRowsCaptured: percentageRows.length,
      },
      percentageRows,
    };
  }

  function mergeSegments(segments) {
    const groups = new Map();
    for (const segment of segments) {
      const key = segment.headers.map(normalize).join("|");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(segment);
    }

    return [...groups.values()].map((group, tableIndex) => {
      const first = group[0];
      const combined = [];
      const aggregateBySignature = new Map();
      const sourceTexts = [];
      const pages = [];
      const provenanceSegments = [];
      const percentageRows = [];
      let confidence = 1;
      const statusValues = [];

      for (const segment of group) {
        statusValues.push(segment.status || "review");
        confidence = Math.min(confidence, Number(segment.confidence || 0));
        pages.push(...segment.pages);
        provenanceSegments.push(segment.provenance);
        if (segment.sourceText) sourceTexts.push(segment.sourceText);
        percentageRows.push(...(segment.percentageRows || []));
        segment.rows.forEach((row, index) => {
          const meta = { ...(segment.rowMeta?.[index] || {}) };
          const isAggregate = meta.role === "total" || meta.role === "grand_total";
          const signature = isAggregate ? aggregateSignature(row, first.headers, first.structure.leadingHeaders.length) : "";
          if (!signature) {
            combined.push({ row, meta });
            return;
          }
          const existingIndex = aggregateBySignature.get(signature);
          if (existingIndex === undefined) {
            aggregateBySignature.set(signature, combined.length);
            combined.push({ row, meta });
            return;
          }
          const existing = combined[existingIndex];
          if (existing?.meta?.role !== "grand_total" && meta.role === "grand_total") combined[existingIndex] = { row, meta };
        });
      }

      const status = statusValues.includes("unresolved")
        ? "unresolved"
        : confidence >= HIGH_CONFIDENCE ? "accepted" : "review";
      return {
        id: `hierarchical-table-${tableIndex + 1}`,
        headers: first.headers,
        rows: combined.map(item => item.row),
        rowMeta: combined.map(item => item.meta),
        confidence,
        status,
        pages: [...new Set(pages)].sort((a, b) => a - b),
        sourceText: sourceTexts.join("\n"),
        provenance: { ...first.provenance, segments: provenanceSegments },
        structure: {
          ...first.structure,
          percentageRowsCaptured: percentageRows.length,
          segmentCount: group.length,
          aggregateDeduplication: "numeric-signature-with-grand-total-preference",
        },
        percentageRows,
      };
    });
  }

  function discoverHierarchicalTables(pageRecords = []) {
    const segments = [];
    for (const page of pageRecords || []) {
      const lines = Array.isArray(page?.lines) ? page.lines : [];
      for (let index = 0; index < lines.length - 1; index += 1) {
        const segment = discoverPageSegment(page, lines, index);
        if (!segment) continue;
        segments.push(segment);
        const endLine = Number(segment.provenance?.endLine || 0);
        if (endLine) {
          const endIndex = lines.findIndex(line => Number(line?.lineIndex || 0) === endLine);
          if (endIndex > index) index = endIndex;
        }
      }
    }
    return mergeSegments(segments);
  }

  window.TaqareerPdfTableStructure = Object.freeze({
    VERSION,
    discoverHierarchicalTables,
    _test: {
      normalize,
      normalizeDigits,
      parseNumber,
      inferHierarchicalHeader,
      percentageOnlyRow,
      rowFromHierarchicalCells,
      rowRole,
      additiveConsistency,
      mergeSegments,
    },
  });
})();
