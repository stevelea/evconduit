'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, ChevronDown, ChevronUp, Smartphone, Loader2, Zap, List, Play, ArrowRight } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://backend.evconduit.com/api';

type XComboScene = {
  scene_id: string;
  xcombo_code: string | null;
  name: string;
  description: string | null;
  category: string | null;
  submitted_by: string | null;
  created_at: string;
};

type SceneSteps = {
  triggers: string[];
  actions: string[];
};

const XPENG_SCENE_API = 'https://private-eur.xpeng.com/personal-tailor/v4/scene/sharedDetailPoster';

function extractSceneId(text: string) {
  const match = text.match(/sceneId=([a-f0-9]{32})/);
  return match?.[1] || '';
}

function formatSceneCode(code: string) {
  const digits = code.replace(/\s/g, '');
  return digits.length === 8 ? `${digits.slice(0, 4)} ${digits.slice(4)}` : code;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractTriggers(cond: any): string[] {
  const triggers: string[] = [];
  if (cond?.left?.name) {
    triggers.push(cond.left.name);
  }
  if (cond?.conditions) {
    for (const c of cond.conditions) {
      triggers.push(...extractTriggers(c));
    }
  }
  return [...new Set(triggers)]; // deduplicate
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractActions(action: any): string[] {
  const actions: string[] = [];
  if (action?.actionType === 'atom') {
    const display = action.argumentsDisplay || '';
    const execName = action.execution?.name || '';
    const parent = action.name || '';
    // Format: "Parent: ExecName -> Display" or "Parent: ExecName" or just "Parent"
    let label = parent;
    if (execName && execName !== parent) label += `: ${execName}`;
    if (display) label += ` \u2192 ${display}`;
    actions.push(label);
  }
  if (action?.actions) {
    for (const a of action.actions) {
      actions.push(...extractActions(a));
    }
  }
  return actions;
}

export default function XComboPage() {
  const [scenes, setScenes] = useState<XComboScene[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Steps expansion state
  const [expandedScene, setExpandedScene] = useState<string | null>(null);
  const [stepsCache, setStepsCache] = useState<Record<string, SceneSteps>>({});
  const [loadingSteps, setLoadingSteps] = useState<string | null>(null);

  // Form fields
  const [shareLink, setShareLink] = useState('');
  const [parsedSceneId, setParsedSceneId] = useState('');
  const [name, setName] = useState('');
  const [xcomboCode, setXcomboCode] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [submittedBy, setSubmittedBy] = useState('');

  useEffect(() => {
    fetchScenes();
  }, []);

  async function fetchScenes() {
    try {
      const res = await fetch(`${API_BASE}/public/xcombo/scenes`);
      if (!res.ok) throw new Error('Failed to fetch scenes');
      const data = await res.json();
      setScenes(data);
    } catch {
      setError('Failed to load XCombos. Please try again later.');
    } finally {
      setLoading(false);
    }
  }

  async function handleShareTextChange(text: string) {
    setShareLink(text);
    setSubmitMessage(null);
    const sceneId = extractSceneId(text);
    setParsedSceneId(sceneId);

    if (!sceneId) return;

    // Auto-fetch scene details from XPeng API
    setFetching(true);
    try {
      const res = await fetch(`${XPENG_SCENE_API}?sceneId=${sceneId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.code === 200 && json.data) {
          const d = json.data;
          setName(d.name || '');
          setDescription(d.description || '');
          if (d.sceneCode) setXcomboCode(formatSceneCode(d.sceneCode));
        }
      }
    } catch {
      // Fall back silently — user can fill manually
    } finally {
      setFetching(false);
    }
  }

  async function fetchSteps(sceneId: string) {
    if (stepsCache[sceneId]) return;
    setLoadingSteps(sceneId);
    try {
      const res = await fetch(`${XPENG_SCENE_API}?sceneId=${sceneId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.code === 200 && json.data) {
          const triggers = extractTriggers(json.data.condition);
          const actions = extractActions(json.data.action);
          setStepsCache(prev => ({ ...prev, [sceneId]: { triggers, actions } }));
        }
      }
    } catch {
      // Silently fail
    } finally {
      setLoadingSteps(null);
    }
  }

  function toggleSteps(e: React.MouseEvent, sceneId: string) {
    e.stopPropagation();
    if (expandedScene === sceneId) {
      setExpandedScene(null);
    } else {
      setExpandedScene(sceneId);
      fetchSteps(sceneId);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!parsedSceneId) {
      setSubmitMessage('Could not find a valid link. Make sure you paste the full URL from the XPeng app.');
      return;
    }
    if (!name.trim()) {
      setSubmitMessage('Please enter a name for this XCombo.');
      return;
    }
    setSubmitting(true);
    setSubmitMessage(null);

    try {
      const res = await fetch(`${API_BASE}/public/xcombo/scenes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scene_id: parsedSceneId,
          name: name.trim(),
          xcombo_code: xcomboCode.trim() || null,
          description: description.trim() || null,
          category: category.trim() || null,
          submitted_by: submittedBy.trim() || null,
        }),
      });

      if (res.status === 409) {
        setSubmitMessage('This XCombo has already been submitted.');
        return;
      }

      if (!res.ok) throw new Error('Submission failed');

      setSubmitMessage('XCombo submitted! Refreshing...');
      await fetchScenes();
      setShareLink('');
      setParsedSceneId('');
      setName('');
      setXcomboCode('');
      setDescription('');
      setCategory('');
      setSubmittedBy('');
    } catch {
      setSubmitMessage('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function openScene(id: string) {
    window.location.href = `https://private-eur.xpeng.com/poster.html?sceneId=${id}&innerJump=xiaopeng://common/car/xcombo/editor?sceneId=${id}`;
  }

  const filteredScenes = scenes.filter(s => !selectedCategory || s.category === selectedCategory);
  const categories = [...new Set(scenes.map(s => s.category).filter(Boolean))] as string[];

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <Zap className="h-8 w-8 text-[#7dd96e]" />
            <h1 className="text-3xl font-bold">XCombo Catalog</h1>
          </div>
          <p className="text-gray-400">
            Browse and share XPeng XCombo automations. Tap a card on your phone to open it in the XPeng app.
          </p>
        </div>

        {/* Submit toggle */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 border-gray-600 bg-transparent text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            {showForm ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Add XCombo
          </Button>
        </div>

        {/* Submission form */}
        {showForm && (
          <Card className="bg-[#252525] border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg text-white">Add an XCombo</CardTitle>
              <p className="text-sm text-gray-400">
                Open the XPeng app, go to the XCombo, tap the share icon, then &quot;Copy Link&quot;, and paste it below. The name, description, and code will be filled in automatically.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-300">Paste share text *</label>
                  <textarea
                    placeholder={"Paste the full share text from XPeng app here...\n\nExample:\nCOMBO Theme：...\nXCOMBO Code：...\nLink：https://..."}
                    value={shareLink}
                    onChange={(e) => handleShareTextChange(e.target.value)}
                    required
                    rows={4}
                    className="w-full rounded-md bg-[#1a1a1a] border border-gray-600 text-white placeholder:text-gray-500 px-3 py-2 text-sm"
                  />
                  {fetching && (
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Fetching scene details...
                    </p>
                  )}
                  {parsedSceneId && !fetching && (
                    <p className="text-xs text-[#7dd96e]">Scene details loaded</p>
                  )}
                  {shareLink && !parsedSceneId && !fetching && (
                    <p className="text-xs text-red-400">No valid link found — make sure the full text is pasted</p>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-300">Name *</label>
                    <Input
                      placeholder="XCombo name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="bg-[#1a1a1a] border-gray-600 text-white placeholder:text-gray-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-300">XCombo Code</label>
                    <Input
                      placeholder="e.g. 6835 0026"
                      value={xcomboCode}
                      onChange={(e) => setXcomboCode(e.target.value)}
                      className="bg-[#1a1a1a] border-gray-600 text-white placeholder:text-gray-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-300">Category</label>
                    <Input
                      placeholder="e.g. Security, Convenience"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="bg-[#1a1a1a] border-gray-600 text-white placeholder:text-gray-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-300">Your Name</label>
                    <Input
                      placeholder="Optional"
                      value={submittedBy}
                      onChange={(e) => setSubmittedBy(e.target.value)}
                      className="bg-[#1a1a1a] border-gray-600 text-white placeholder:text-gray-500"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-300">Description</label>
                  <Input
                    placeholder="What does this XCombo do?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-[#1a1a1a] border-gray-600 text-white placeholder:text-gray-500"
                  />
                </div>
                <div className="flex items-center gap-4">
                  <Button
                    type="submit"
                    disabled={submitting || !parsedSceneId}
                    className="bg-[#7dd96e] text-black hover:bg-[#6bc45e] disabled:opacity-40"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Submit
                  </Button>
                  {submitMessage && (
                    <p className="text-sm text-gray-400">{submitMessage}</p>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Loading state */}
        {loading && (
          <div className="text-center py-12 text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            Loading...
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="text-center py-12 text-red-400">{error}</div>
        )}

        {/* Empty state */}
        {!loading && !error && scenes.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg font-medium">No XCombos yet</p>
            <p>Be the first to add one!</p>
          </div>
        )}

        {/* Category filter */}
        {!loading && categories.length > 1 && (
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className={selectedCategory === null
                ? 'bg-[#7dd96e] text-black hover:bg-[#6bc45e]'
                : 'bg-[#2a2a2a] text-gray-300 border-gray-600 hover:bg-[#333] hover:text-white'}
            >
              All
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                className={selectedCategory === cat
                  ? 'bg-[#7dd96e] text-black hover:bg-[#6bc45e]'
                  : 'bg-[#2a2a2a] text-gray-300 border-gray-600 hover:bg-[#333] hover:text-white'}
              >
                {cat}
              </Button>
            ))}
          </div>
        )}

        {/* XCombo grid */}
        {!loading && scenes.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredScenes.map((scene) => (
              <Card
                key={scene.scene_id}
                className="bg-[#252525] border-gray-700 hover:border-[#7dd96e]/50 hover:shadow-lg hover:shadow-[#7dd96e]/5 transition-all"
              >
                <CardContent className="pt-5 pb-4 space-y-3">
                  <div
                    className="cursor-pointer"
                    onClick={() => openScene(scene.scene_id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#7dd96e]/15 flex items-center justify-center flex-shrink-0">
                          <Zap className="h-4 w-4 text-[#7dd96e]" />
                        </div>
                        <h3 className="font-semibold text-white leading-tight">{scene.name}</h3>
                      </div>
                      <Smartphone className="h-4 w-4 text-gray-500 flex-shrink-0 mt-1" />
                    </div>
                    {scene.description && (
                      <p className="text-sm text-gray-400 line-clamp-2 mt-3">
                        {scene.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {scene.category && (
                        <span className="text-xs bg-[#7dd96e]/10 text-[#7dd96e] px-2 py-0.5 rounded-full">
                          {scene.category}
                        </span>
                      )}
                      {scene.xcombo_code && (
                        <span className="text-xs font-mono text-gray-500">
                          {scene.xcombo_code}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => toggleSteps(e, scene.scene_id)}
                      className="text-xs text-gray-400 hover:text-[#7dd96e] flex items-center gap-1 transition-colors"
                    >
                      <List className="h-3 w-3" />
                      Steps
                      {expandedScene === scene.scene_id ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                  {scene.submitted_by && (
                    <span className="text-xs text-gray-500 block">
                      by {scene.submitted_by}
                    </span>
                  )}

                  {/* Expandable steps section */}
                  {expandedScene === scene.scene_id && (
                    <div className="border-t border-gray-700 pt-3 mt-2 space-y-3">
                      {loadingSteps === scene.scene_id ? (
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Loader2 className="h-3 w-3 animate-spin" /> Loading steps...
                        </div>
                      ) : stepsCache[scene.scene_id] ? (
                        <>
                          {stepsCache[scene.scene_id].triggers.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-gray-300 mb-1.5 flex items-center gap-1">
                                <Play className="h-3 w-3 text-[#7dd96e]" /> Trigger
                              </p>
                              <ul className="space-y-1">
                                {stepsCache[scene.scene_id].triggers.map((t, i) => (
                                  <li key={i} className="text-xs text-gray-400 pl-4">
                                    {t}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {stepsCache[scene.scene_id].actions.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-gray-300 mb-1.5 flex items-center gap-1">
                                <ArrowRight className="h-3 w-3 text-[#7dd96e]" /> Actions
                              </p>
                              <ul className="space-y-1">
                                {stepsCache[scene.scene_id].actions.map((a, i) => (
                                  <li key={i} className="text-xs text-gray-400 pl-4">
                                    {a}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {stepsCache[scene.scene_id].triggers.length === 0 &&
                           stepsCache[scene.scene_id].actions.length === 0 && (
                            <p className="text-xs text-gray-500">No step details available.</p>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-gray-500">Could not load steps.</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 space-y-1 pt-4">
          <p>Tap a card on your phone to open it in the XPeng app.</p>
          <p>XCombos are community-submitted. Duplicates are automatically rejected.</p>
        </div>
      </div>
    </div>
  );
}
