'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  TrackerRecord,
  STATUS_OPTIONS,
  TYPE_OPTIONS,
  FUNCTION_OPTIONS,
  CAR_MODEL_OPTIONS,
  STATUS_COLORS,
  TYPE_COLORS,
  LARK_FORM_URL,
  FORM_XOS_VERSIONS,
} from '@/lib/lark';

type SortField = 'id' | 'type' | 'status' | 'title' | 'fixedInXOS';
type SortDir = 'asc' | 'desc';

export default function TrackerPage() {
  const [records, setRecords] = useState<TrackerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [functionFilter, setFunctionFilter] = useState('');
  const [carModelFilter, setCarModelFilter] = useState('');

  // Sort
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Detail view
  const [selectedRecord, setSelectedRecord] = useState<TrackerRecord | null>(null);

  // Add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addTitle, setAddTitle] = useState('');
  const [addDescription, setAddDescription] = useState('');
  const [addType, setAddType] = useState('');
  const [addFunctions, setAddFunctions] = useState<string[]>([]);
  const [addCarModels, setAddCarModels] = useState<string[]>([]);
  const [addXosVersion, setAddXosVersion] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addCountry, setAddCountry] = useState('');
  const [translatedTitle, setTranslatedTitle] = useState('');
  const [translatedDesc, setTranslatedDesc] = useState('');
  const [translating, setTranslating] = useState(false);
  const [duplicates, setDuplicates] = useState<TrackerRecord[]>([]);

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/xpeng-tracker/api/records');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRecords(data.records);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Auto-detect country and restore saved email
  useEffect(() => {
    // Detect country from IP
    fetch('https://ipapi.co/json/')
      .then((r) => r.json())
      .then((d) => {
        if (d.country_name) setAddCountry(d.country_name);
      })
      .catch(() => {});
    // Restore saved email
    const savedEmail = localStorage.getItem('xpeng-tracker-email');
    if (savedEmail) setAddEmail(savedEmail);
  }, []);

  // Filter and sort
  const filtered = useMemo(() => {
    let result = records;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          r.statusComments.toLowerCase().includes(q)
      );
    }
    if (typeFilter) result = result.filter((r) => r.type === typeFilter);
    if (statusFilter) result = result.filter((r) => r.status === statusFilter);
    if (functionFilter) result = result.filter((r) => r.functions.includes(functionFilter));
    if (carModelFilter) result = result.filter((r) => r.carModels.includes(carModelFilter));

    // Sort
    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'id') {
        const numA = parseInt(a.id.replace('ID-', '')) || 0;
        const numB = parseInt(b.id.replace('ID-', '')) || 0;
        cmp = numA - numB;
      } else {
        cmp = (a[sortField] || '').localeCompare(b[sortField] || '');
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [records, search, typeFilter, statusFilter, functionFilter, carModelFilter, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'id' ? 'desc' : 'asc');
    }
  };

  const sortIcon = (field: SortField) => {
    if (sortField !== field) return ' \u2195';
    return sortDir === 'asc' ? ' \u2191' : ' \u2193';
  };

  // Stats
  const stats = useMemo(() => {
    const total = records.length;
    const issues = records.filter((r) => r.type === 'Issue').length;
    const suggestions = records.filter((r) => r.type === 'Suggestion').length;
    const open = records.filter(
      (r) => !['Done / Released', 'Ended / Declined', 'Blocked'].includes(r.status)
    ).length;
    const done = records.filter((r) => r.status === 'Done / Released').length;
    return { total, issues, suggestions, open, done };
  }, [records]);

  // Duplicate check for add form
  const checkDuplicates = useCallback(
    (title: string) => {
      if (!title || title.length < 5) {
        setDuplicates([]);
        return;
      }
      const words = title.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
      const matches = records.filter((r) => {
        const rTitle = r.title.toLowerCase();
        const rDesc = r.description.toLowerCase();
        const matchCount = words.filter((w) => rTitle.includes(w) || rDesc.includes(w)).length;
        return matchCount >= Math.max(2, Math.floor(words.length * 0.4));
      });
      setDuplicates(matches.slice(0, 5));
    },
    [records]
  );

  // Description quality suggestions for Chinese responders
  const descriptionSuggestions = useMemo(() => {
    if (!addDescription || addDescription.length < 10) return [];
    const desc = addDescription.toLowerCase();
    const suggestions: { icon: string; text: string }[] = [];
    const isIssue = addType === 'Issue';

    if (isIssue) {
      // Steps to reproduce
      if (!/step|reproduce|how to|first.*then|1\.|1\)/i.test(desc)) {
        suggestions.push({
          icon: '1️⃣',
          text: 'Add steps to reproduce (e.g. "1. Open navigation 2. Search for address 3. Issue appears")',
        });
      }
      // Expected vs actual
      if (!/expect|should|instead|actual|but it/i.test(desc)) {
        suggestions.push({
          icon: '🎯',
          text: 'Describe expected vs actual behavior (e.g. "Expected: X. Actual: Y")',
        });
      }
      // Frequency
      if (!/always|sometimes|every time|once|intermittent|random|occasional|frequent|rare|reproduc/i.test(desc)) {
        suggestions.push({
          icon: '🔄',
          text: 'How often does this happen? (always, sometimes, only once, after specific action)',
        });
      }
      // After update
      if (!/update|upgrade|version|xos|since|after|started|began|new/i.test(desc)) {
        suggestions.push({
          icon: '📦',
          text: 'Did this start after a software update? If so, which version worked correctly before?',
        });
      }
    }

    // Specific conditions
    if (!/weather|temperature|speed|parked|driving|charging|km|mph|celsius|cold|hot|rain|night|morning/i.test(desc)) {
      suggestions.push({
        icon: '🌡️',
        text: 'Mention conditions when it occurs (driving/parked, speed, weather, temperature, time of day)',
      });
    }

    // Screen / menu location
    if (!/screen|menu|setting|display|button|icon|dashboard|infotainment|app|page/i.test(desc)) {
      suggestions.push({
        icon: '📱',
        text: 'Specify where in the car UI this occurs (which screen, menu, or setting)',
      });
    }

    // Keep language simple
    const idiomPatterns = /a piece of cake|no brainer|pain in the|hit or miss|at the end of the day|out of the box|bang for|bells and whistles/i;
    if (idiomPatterns.test(desc)) {
      suggestions.push({
        icon: '💬',
        text: 'Avoid English idioms — use simple, direct language that translates clearly to Chinese',
      });
    }

    // Suggest screenshot/video if not mentioned
    if (!/screenshot|photo|video|record|attach|image|picture|film/i.test(desc) && isIssue) {
      suggestions.push({
        icon: '📷',
        text: 'Consider attaching a screenshot or video — visuals help when language differs',
      });
    }

    return suggestions.slice(0, 5);
  }, [addDescription, addType]);

  const translateAndAppend = async () => {
    if (!addTitle && !addDescription) return;
    setTranslating(true);
    try {
      if (addTitle) {
        // Only translate the English part (before any existing Chinese)
        const englishTitle = addTitle.split('\n')[0].trim();
        const res = await fetch('/xpeng-tracker/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: englishTitle }),
        });
        const data = await res.json();
        const zh = data.translated || '';
        setTranslatedTitle(zh);
        // Append Chinese to title if not already there
        if (zh && !addTitle.includes(zh)) {
          setAddTitle(`${englishTitle}\n${zh}`);
        }
      }
      if (addDescription) {
        // Only translate the English part (before the Chinese separator)
        const parts = addDescription.split('\n---\n');
        const englishDesc = parts[0].trim();
        const res = await fetch('/xpeng-tracker/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: englishDesc }),
        });
        const data = await res.json();
        const zh = data.translated || '';
        setTranslatedDesc(zh);
        // Append Chinese to description if not already there
        if (zh && !addDescription.includes(zh)) {
          setAddDescription(`${englishDesc}\n---\n${zh}`);
        }
      }
    } catch {
      // Translation is best-effort
    } finally {
      setTranslating(false);
    }
  };

  // Map our tracker types to Lark form types
  const FORM_TYPE_MAP: Record<string, string> = {
    Issue: 'Issue or bug',
    Suggestion: 'Improvement',
  };

  // Map our car model names to Lark form car options
  const FORM_CAR_MAP: Record<string, string> = {
    'G6 2025': 'G6 2025 FL',
    'G9 2025': 'G9 2025 FL',
    G6: 'G6 2024',
    'G9 2023': 'G9 2023',
    'G9 2024': 'G9 2024',
    P7: 'P7',
    'All models': 'all models',
  };

  // Lark form prefill uses the form question TITLES, not field names
  const FORM_QUESTIONS = {
    name: 'Name',
    description: 'Describe the issue or your suggestion for improvement',
    type: 'Is this a issue or a suggestion for improvement?',
    car: 'Which car do you have?',
    softwareVersion:
      'Which software version were you running when you first noticed the issue, or which version would you like to suggest improvements for?',
    nationality: 'Which country are you from?',
    email: 'E-mail',
    checkedDuplicates:
      "I've checked the Lark Base first to see whether the issue is already known.",
  };

  const openLarkForm = () => {
    const params = new URLSearchParams();
    if (addTitle) params.set(`prefill_${FORM_QUESTIONS.name}`, addTitle);
    if (addDescription) params.set(`prefill_${FORM_QUESTIONS.description}`, addDescription);
    if (addType) params.set(`prefill_${FORM_QUESTIONS.type}`, FORM_TYPE_MAP[addType] || addType);
    if (addCarModels.length > 0) {
      const mapped = FORM_CAR_MAP[addCarModels[0]];
      if (mapped) params.set(`prefill_${FORM_QUESTIONS.car}`, mapped);
    }
    if (addXosVersion) params.set(`prefill_${FORM_QUESTIONS.softwareVersion}`, addXosVersion);
    if (addCountry) params.set(`prefill_${FORM_QUESTIONS.nationality}`, addCountry);
    if (addEmail) params.set(`prefill_${FORM_QUESTIONS.email}`, addEmail);
    // Always tick "I've checked for duplicates"
    params.set(`prefill_${FORM_QUESTIONS.checkedDuplicates}`, 'Yes');

    const url = params.toString()
      ? `${LARK_FORM_URL}?${params.toString()}`
      : LARK_FORM_URL;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading XPENG issue tracker...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <p className="text-xl font-semibold mb-2">Error</p>
          <p>{error}</p>
          <button onClick={fetchRecords} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">XPENG Issue & Suggestion Tracker ( Lark Database FrontEnd )</h1>
          <p className="text-sm text-gray-500 mt-1">
            Community-driven tracker for XPENG vehicle issues and feature suggestions
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
        >
          + Report Issue
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <StatCard label="Total" value={stats.total} color="bg-gray-100" />
        <StatCard label="Issues" value={stats.issues} color="bg-red-50" />
        <StatCard label="Suggestions" value={stats.suggestions} color="bg-blue-50" />
        <StatCard label="Open" value={stats.open} color="bg-yellow-50" />
        <StatCard label="Done" value={stats.done} color="bg-green-50" />
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-white border rounded-lg p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Report New Issue / Suggestion</h2>
          <p className="text-sm text-gray-500 mb-4">
            Fill in the details below. We&apos;ll check for duplicates and auto-translate to Chinese.
            The actual submission goes through the official Lark form.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={addType}
                onChange={(e) => setAddType(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              >
                <option value="">Select type...</option>
                {Object.values(TYPE_OPTIONS).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Car Model</label>
              <select
                value={addCarModels[0] || ''}
                onChange={(e) => setAddCarModels(e.target.value ? [e.target.value] : [])}
                className="w-full border rounded px-3 py-2 text-sm"
              >
                <option value="">Select car...</option>
                {Object.values(CAR_MODEL_OPTIONS).filter(m => m !== 'N/A').map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">XOS Version</label>
              <select
                value={addXosVersion}
                onChange={(e) => setAddXosVersion(e.target.value)}
                className="w-full border rounded px-3 py-2 text-sm"
              >
                <option value="">Select version...</option>
                {FORM_XOS_VERSIONS.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input
                type="text"
                value={addCountry}
                onChange={(e) => setAddCountry(e.target.value)}
                placeholder="Auto-detected from IP"
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                type="email"
                value={addEmail}
                onChange={(e) => {
                  setAddEmail(e.target.value);
                  localStorage.setItem('xpeng-tracker-email', e.target.value);
                }}
                placeholder="Your email (saved for next time)"
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Function Area</label>
              <select
                multiple
                value={addFunctions}
                onChange={(e) => setAddFunctions(Array.from(e.target.selectedOptions, (o) => o.value))}
                className="w-full border rounded px-3 py-2 text-sm h-20"
              >
                {Object.values(FUNCTION_OPTIONS).map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <textarea
                value={addTitle}
                onChange={(e) => {
                  setAddTitle(e.target.value);
                  checkDuplicates(e.target.value.split('\n')[0]);
                }}
                placeholder="Brief summary of the issue or suggestion"
                rows={2}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={addDescription}
                onChange={(e) => setAddDescription(e.target.value)}
                placeholder="Detailed description..."
                rows={6}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Description suggestions */}
          {descriptionSuggestions.length > 0 && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm font-medium text-blue-800 mb-2">
                Suggestions to improve clarity for XPENG reviewers:
              </p>
              <ul className="space-y-1.5">
                {descriptionSuggestions.map((s, i) => (
                  <li key={i} className="text-sm text-blue-700 flex gap-2">
                    <span className="flex-shrink-0">{s.icon}</span>
                    <span>{s.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Duplicate check results */}
          {duplicates.length > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm font-medium text-yellow-800 mb-2">
                Possible duplicates found ({duplicates.length}):
              </p>
              {duplicates.map((d) => (
                <div
                  key={d.recordId}
                  className="text-sm text-yellow-700 cursor-pointer hover:underline mb-1"
                  onClick={() => setSelectedRecord(d)}
                >
                  {d.id} - {d.title} ({d.status})
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-4 flex gap-3 flex-wrap">
            <button
              onClick={openLarkForm}
              disabled={!addTitle}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm"
            >
              Submit via Lark Form
            </button>
            <p className="text-xs text-gray-400 self-center">
              Fields will be pre-filled in the Lark form
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border rounded-lg p-4 mb-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, description, ID..."
            className="border rounded px-3 py-2 text-sm"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="">All Types</option>
            {Object.values(TYPE_OPTIONS).map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="">All Statuses</option>
            {Object.values(STATUS_OPTIONS).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <select
            value={functionFilter}
            onChange={(e) => setFunctionFilter(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="">All Functions</option>
            {Object.values(FUNCTION_OPTIONS).map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <select
            value={carModelFilter}
            onChange={(e) => setCarModelFilter(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          >
            <option value="">All Car Models</option>
            {Object.values(CAR_MODEL_OPTIONS).map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="text-sm text-gray-500">
            Showing {filtered.length} of {records.length} records
          </span>
          <button
            onClick={() => {
              setSearch('');
              setTypeFilter('');
              setStatusFilter('');
              setFunctionFilter('');
              setCarModelFilter('');
            }}
            className="text-sm text-blue-600 hover:underline"
          >
            Clear filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th
                  className="px-3 py-3 text-left font-medium text-gray-600 cursor-pointer hover:text-gray-900 whitespace-nowrap"
                  onClick={() => toggleSort('id')}
                >
                  ID{sortIcon('id')}
                </th>
                <th
                  className="px-3 py-3 text-left font-medium text-gray-600 cursor-pointer hover:text-gray-900 whitespace-nowrap"
                  onClick={() => toggleSort('type')}
                >
                  Type{sortIcon('type')}
                </th>
                <th
                  className="px-3 py-3 text-left font-medium text-gray-600 cursor-pointer hover:text-gray-900 whitespace-nowrap"
                  onClick={() => toggleSort('status')}
                >
                  Status{sortIcon('status')}
                </th>
                <th className="px-3 py-3 text-left font-medium text-gray-600">Function</th>
                <th
                  className="px-3 py-3 text-left font-medium text-gray-600 cursor-pointer hover:text-gray-900"
                  onClick={() => toggleSort('title')}
                >
                  Title{sortIcon('title')}
                </th>
                <th className="px-3 py-3 text-left font-medium text-gray-600">Car Models</th>
                <th className="px-3 py-3 text-left font-medium text-gray-600 whitespace-nowrap">Fixed in XOS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((record) => (
                <tr
                  key={record.recordId}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedRecord(record)}
                >
                  <td className="px-3 py-2.5 whitespace-nowrap font-mono text-xs text-gray-500">
                    {record.id}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {record.type && (
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[record.type] || ''}`}>
                        {record.type}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {record.status && (
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[record.status] || ''}`}>
                        {record.status}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {record.functions.map((f) => (
                        <span key={f} className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                          {f}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 max-w-[300px]">
                    <span className="line-clamp-2">{record.title}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {record.carModels.map((m) => (
                        <span key={m} className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs whitespace-nowrap">
                          {m}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-500">
                    {record.fixedInXOS}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-500">No records match your filters</div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedRecord && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedRecord(null);
          }}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-sm font-mono text-gray-500">{selectedRecord.id}</span>
                  <div className="flex gap-2 mt-1">
                    {selectedRecord.type && (
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[selectedRecord.type] || ''}`}>
                        {selectedRecord.type}
                      </span>
                    )}
                    {selectedRecord.status && (
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[selectedRecord.status] || ''}`}>
                        {selectedRecord.status}
                      </span>
                    )}
                    {selectedRecord.fixedInXOS && (
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                        XOS {selectedRecord.fixedInXOS}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                >
                  &times;
                </button>
              </div>

              <h2 className="text-lg font-semibold text-gray-900 mb-3">{selectedRecord.title}</h2>

              {selectedRecord.description && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Description</h3>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 rounded p-3">
                    {selectedRecord.description}
                  </p>
                </div>
              )}

              {selectedRecord.statusComments && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Status Comments</h3>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap bg-yellow-50 rounded p-3">
                    {selectedRecord.statusComments}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {selectedRecord.functions.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-600 mb-1">Function Areas</h3>
                    <div className="flex flex-wrap gap-1">
                      {selectedRecord.functions.map((f) => (
                        <span key={f} className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedRecord.carModels.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-600 mb-1">Car Models</h3>
                    <div className="flex flex-wrap gap-1">
                      {selectedRecord.carModels.map((m) => (
                        <span key={m} className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`${color} rounded-lg p-3 text-center`}>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-600">{label}</div>
    </div>
  );
}
