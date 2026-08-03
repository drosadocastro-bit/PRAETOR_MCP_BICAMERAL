import express from 'express';
import type { Request, Response } from 'express';
import { scenarioFixtures } from './scenarios.js';
import { evaluateAdvisoryPacket } from './governance.js';
import { getActiveDatasetAdapter } from './adapters/adapterRegistry.js';
import {
  adapterCall,
  validateEvidence,
  validateExcerpt,
  validatePatterns,
  validatePriorCases,
  validateRecentAnomalies,
  validateRecord,
  validateRecords,
  validateSource
} from './adapters/adapterValidation.js';
import { AdvisoryPacketSchema, validateAdvisoryPacket } from './schema.js';
import { appendAdvisoryPacket, readAdvisoryPackets } from './storage.js';
import { CortexEvidenceGate, SourceType } from './cortex/evidenceGate.js';
import { GovernanceDecisionService } from './services/governanceDecisionService.js';
import { FileAuditEventSink } from './audit.js';
import { analyzeEvidenceIndependence } from './dependencyGraph.js';
import type { AdvisoryPacketDraft, AdvisoryPacketRecord } from './types.js';

const governanceService = new GovernanceDecisionService(new FileAuditEventSink());

export function createWebApp() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      app: 'praetor-mcp',
      version: '0.1.0',
      port: process.env.PORT || 3000,
      protocol66: 'active',
      agentK: 'quarantine_ready',
      tools_count: 11,
      timestamp: new Date().toISOString()
    });
  });

  // Get tools list
  app.get('/api/tools', (_req: Request, res: Response) => {
    res.json({
      tools: [
        {
          name: 'search_maintenance_records',
          description: 'Search synthetic maintenance records by equipment ID, anomaly code, or keyword.',
          inputSchema: { equipment_id: 'string?', anomaly_code: 'string?', keyword: 'string?', limit: 'number?' }
        },
        {
          name: 'get_equipment_history',
          description: 'Return synthetic maintenance history for one equipment identifier.',
          inputSchema: { equipment_id: 'string', limit: 'number?' }
        },
        {
          name: 'get_recent_anomalies',
          description: 'Return synthetic recent anomaly records.',
          inputSchema: { days: 'number?', limit: 'number?' }
        },
        {
          name: 'get_recurring_patterns',
          description: 'Return synthetic recurring anomaly patterns.',
          inputSchema: { min_recurrence: 'number?' }
        },
        {
          name: 'get_source_metadata',
          description: 'Return synthetic source metadata for one source identifier.',
          inputSchema: { source_id: 'string' }
        },
        {
          name: 'retrieve_supporting_evidence',
          description: 'Collect synthetic supporting evidence for an equipment finding.',
          inputSchema: { equipment_id: 'string?', anomaly_code: 'string?', finding: 'string?' }
        },
        {
          name: 'retrieve_document_excerpt',
          description: 'Return one synthetic document excerpt by source identifier or excerpt identifier.',
          inputSchema: { source_id: 'string?', excerpt_id: 'string?' }
        },
        {
          name: 'retrieve_prior_cases',
          description: 'Return prior synthetic cases that support the current advisory review.',
          inputSchema: { equipment_id: 'string?', anomaly_code: 'string?' }
        },
        {
          name: 'retrieve_anomaly_context',
          description: 'Return synthetic anomaly context for a record or equipment identifier.',
          inputSchema: { record_id: 'string?', equipment_id: 'string?', anomaly_code: 'string?' }
        },
        {
          name: 'evaluate_evidence_boundary',
          description: 'Review whether a proposed answer separates chat claims, retrieved evidence, model inference, and audit events.',
          inputSchema: { session_id: 'string', user_prompt: 'string', draft_answer: 'string?', domain: 'string?', retrieved_evidence: 'array' }
        },
        {
          name: 'submit_review_advisory_packet',
          description: 'Persist a review-only synthetic advisory packet after deterministic governance checks pass.',
          inputSchema: 'AdvisoryPacketSchema'
        }
      ]
    });
  });

  // Call MCP tool directly via REST API
  app.post('/api/tools/call', async (req: Request, res: Response) => {
    try {
      const { name, arguments: args = {} } = req.body;
      const adapter = getActiveDatasetAdapter();

      switch (name) {
        case 'search_maintenance_records': {
          const records = await adapterCall('searchRecords', () => adapter.searchRecords(args), validateRecords);
          return res.json({ status: 'success', data: { records } });
        }
        case 'get_equipment_history': {
          if (!args.equipment_id) return res.status(400).json({ error: 'equipment_id is required' });
          const records = await adapterCall('searchRecords', () => adapter.searchRecords({ equipment_id: args.equipment_id, limit: args.limit }), validateRecords);
          return res.json({ status: 'success', data: { records } });
        }
        case 'get_recent_anomalies': {
          const result = await adapterCall('getRecentAnomalies', () => adapter.getRecentAnomalies({ days: args.days ?? 90 }), validateRecentAnomalies);
          return res.json({ status: 'success', data: result });
        }
        case 'get_recurring_patterns': {
          const patterns = await adapterCall('getRecurringPatterns', () => adapter.getRecurringPatterns({ equipment_id: args.equipment_id }), validatePatterns);
          return res.json({ status: 'success', data: { patterns } });
        }
        case 'get_source_metadata': {
          if (!args.source_id) return res.status(400).json({ error: 'source_id is required' });
          const source = await adapterCall('getSourceMetadata', () => adapter.getSourceMetadata(args.source_id), validateSource);
          return res.json({ status: 'success', data: { source } });
        }
        case 'retrieve_supporting_evidence': {
          const evidence = await adapterCall('getSupportingEvidence', () => adapter.getSupportingEvidence(args), validateEvidence);
          return res.json({ status: 'success', data: { criteria: args, evidence } });
        }
        case 'retrieve_document_excerpt': {
          const excerpt = await adapterCall('getDocumentExcerpt', () => adapter.getDocumentExcerpt(args.source_id, args.excerpt_id), validateExcerpt);
          return res.json({ status: 'success', data: { excerpt } });
        }
        case 'retrieve_prior_cases': {
          const cases = await adapterCall('getPriorCases', () => adapter.getPriorCases(args), validatePriorCases);
          return res.json({ status: 'success', data: { cases } });
        }
        case 'retrieve_anomaly_context': {
          const record = args.record_id
            ? await adapterCall('getRecordById', () => adapter.getRecordById(args.record_id), validateRecord)
            : (await adapterCall('searchRecords', () => adapter.searchRecords({ equipment_id: args.equipment_id, anomaly_code: args.anomaly_code, limit: 1 }), validateRecords))[0] ?? null;
          const evidence = await adapterCall('getSupportingEvidence', () => adapter.getSupportingEvidence({
            equipment_id: args.equipment_id ?? record?.equipment_id,
            anomaly_code: args.anomaly_code ?? record?.anomaly_code,
            finding: record?.technician_note
          }), validateEvidence);
          const source = record ? await adapterCall('getSourceMetadata', () => adapter.getSourceMetadata(record.source_id), validateSource) : null;
          const priorCases = await adapterCall('getPriorCases', () => adapter.getPriorCases({
            equipment_id: record?.equipment_id,
            anomaly_code: record?.anomaly_code
          }), validatePriorCases);
          return res.json({ status: 'success', data: { record, source, evidence, prior_cases: priorCases } });
        }
        case 'evaluate_evidence_boundary': {
          const compoundEvaluation = await governanceService.evaluateCompoundGovernance({
            sessionId: args.session_id || 'web-session',
            userPrompt: args.user_prompt || 'Evaluate evidence boundary.',
            draftAnswer: args.draft_answer,
            domain: args.domain,
            retrievedEvidence: (args.retrieved_evidence || []).map((item: any) => ({
              id: item.id || 'ev-1',
              text: item.text || '',
              sourceType: item.source_type || SourceType.MCP_RETRIEVED,
              sourceId: item.source_id,
              sourceDomain: item.source_domain,
              provenance: item.provenance
            })),
            toolCallsUsed: ['evaluate_evidence_boundary']
          });
          return res.json({
            status: 'success',
            data: {
              ...compoundEvaluation.evidence,
              risk: compoundEvaluation.risk,
              compoundDecision: compoundEvaluation.decision,
              compoundGovernance: compoundEvaluation
            }
          });
        }
        case 'submit_review_advisory_packet': {
          const validation = validateAdvisoryPacket(args);
          if (!validation.valid) {
            return res.status(400).json({ error: 'Schema rejected: advisory packet invalid', details: validation.issues });
          }
          const packet = validation.data as AdvisoryPacketDraft;
          const assessment = evaluateAdvisoryPacket(packet);
          const contradictionStatus = assessment.guardrail_results.some(r => r.check === 'contradiction_handling' && r.status === 'flag') ? 'present' : 'not_detected';
          const circularEvidenceStatus = assessment.guardrail_results.some(r => r.check === 'false_consensus' && r.status === 'flag') ? 'present' : 'not_detected';
          const record: AdvisoryPacketRecord = {
            ...packet,
            advisory_id: packet.advisory_id!,
            subsystem: packet.subsystem!,
            component: packet.component!,
            source_ids: packet.source_ids!,
            evidence_summary: packet.evidence_summary!,
            provenance: packet.provenance!,
            contradiction_status: contradictionStatus,
            circular_evidence_status: circularEvidenceStatus,
            integrity_verdict: assessment.verdict,
            integrity_summary: assessment.summary,
            stored_at: new Date().toISOString(),
            guardrail_results: assessment.guardrail_results,
            evidence_independence: analyzeEvidenceIndependence(packet.supporting_evidence)
          };
          if (!assessment.accepted) {
            return res.status(422).json({ error: 'Governance rejected', assessment });
          }
          await appendAdvisoryPacket(record);
          return res.json({ status: 'stored', assessment, packet: record });
        }
        default:
          return res.status(404).json({ error: `Unknown tool: ${name}` });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Tool call failed' });
    }
  });

  // Get scenarios with live evaluation
  app.get('/api/scenarios', (_req: Request, res: Response) => {
    const results = scenarioFixtures.map(fixture => {
      const evaluation = evaluateAdvisoryPacket(fixture.packet);
      return {
        id: fixture.id,
        name: fixture.name,
        expected_verdict: fixture.expected_verdict,
        actual_verdict: evaluation.verdict,
        matches_expectation: evaluation.verdict === fixture.expected_verdict,
        accepted: evaluation.accepted,
        confidence: fixture.packet.confidence ?? 0,
        summary: evaluation.summary,
        guardrail_results: evaluation.guardrail_results,
        packet: fixture.packet
      };
    });
    res.json({ scenarios: results });
  });

  // Get synthetic records
  app.get('/api/records', async (_req: Request, res: Response) => {
    try {
      const adapter = getActiveDatasetAdapter();
      const records = await adapterCall('searchRecords', () => adapter.searchRecords({ limit: 50 }), validateRecords);
      const patterns = await adapterCall('getRecurringPatterns', () => adapter.getRecurringPatterns({}), validatePatterns);
      res.json({ records, patterns });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get advisory packets
  app.get('/api/advisories', async (_req: Request, res: Response) => {
    try {
      const packets = await readAdvisoryPackets();
      res.json({ packets });
    } catch (err: any) {
      res.json({ packets: [], note: 'No stored packets or storage empty.' });
    }
  });

  // Serve HTML Web Interface
  app.get('/', (_req: Request, res: Response) => {
    res.send(getDashboardHtml());
  });

  return app;
}

function getDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Praetor MCP — Evidence Comparison & Safety Runtime</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
    body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #f8fafc; color: #0f172a; }
    code, pre { font-family: 'JetBrains Mono', monospace; }
    .badge-safe { background-color: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
    .badge-doubtful { background-color: #fef9c3; color: #a16207; border: 1px solid #fef08a; }
    .badge-rejected { background-color: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
    .badge-quarantined { background-color: #fae8ff; color: #86198f; border: 1px solid #f5d0fe; }

    @keyframes crestShimmer {
      0% { opacity: 0.75; filter: drop-shadow(0 0 2px rgba(239, 68, 68, 0.5)); }
      50% { opacity: 1; filter: drop-shadow(0 0 10px rgba(239, 68, 68, 0.95)); }
      100% { opacity: 0.75; filter: drop-shadow(0 0 2px rgba(239, 68, 68, 0.5)); }
    }
    @keyframes jewelGlow {
      0%, 100% { opacity: 0.5; transform: scale(0.9); }
      50% { opacity: 1; transform: scale(1.3); }
    }
    @keyframes armorAura {
      0%, 100% { box-shadow: 0 0 12px rgba(245, 158, 11, 0.2), inset 0 0 6px rgba(99, 102, 241, 0.3); }
      50% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.45), inset 0 0 10px rgba(99, 102, 241, 0.5); }
    }
    .praetor-plume {
      animation: crestShimmer 2.2s ease-in-out infinite;
    }
    .praetor-jewel {
      animation: jewelGlow 1.8s ease-in-out infinite;
      transform-origin: 28px 20px;
    }
    .praetor-logo-container {
      animation: armorAura 3s ease-in-out infinite;
    }
    .praetor-animated-svg {
      transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .praetor-logo-container:hover .praetor-animated-svg {
      transform: scale(1.1) rotate(-3deg);
    }
  </style>
</head>
<body class="min-h-screen flex flex-col bg-slate-50 text-slate-900">
  <!-- Top Navigation Header -->
  <header class="bg-white border-b border-slate-200 sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
      <div class="flex items-center space-x-3.5">
        <!-- Animated Roman Praetor P Logo -->
        <div class="praetor-logo-container group cursor-pointer relative flex items-center justify-center w-11 h-11 rounded-xl bg-slate-950 shadow-md border border-amber-500/40 overflow-hidden transition-all duration-300">
          <div class="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-950 to-amber-950/40 opacity-90"></div>
          <svg class="w-8 h-8 relative z-10 praetor-animated-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="praetorGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#FDE68A" />
                <stop offset="45%" stop-color="#F59E0B" />
                <stop offset="100%" stop-color="#B45309" />
              </linearGradient>
              <linearGradient id="praetorCrest" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#EF4444" />
                <stop offset="50%" stop-color="#F87171" />
                <stop offset="100%" stop-color="#991B1B" />
              </linearGradient>
              <linearGradient id="bladeSteel" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#FDE68A" />
                <stop offset="50%" stop-color="#F59E0B" />
                <stop offset="100%" stop-color="#78350F" />
              </linearGradient>
            </defs>

            <!-- Roman Praetor Centurion Transversa Crista (Red Plume over the P) -->
            <path class="praetor-plume" d="M 18,24 C 18,8 42,4 78,14 C 88,18 90,26 82,28 C 68,22 42,16 24,28 Z" fill="url(#praetorCrest)" />
            <!-- Plume Inner Shimmer Accent -->
            <path d="M 24,20 C 34,10 54,8 74,15" stroke="#FEE2E2" stroke-width="2" stroke-linecap="round" opacity="0.85" />

            <!-- Helmet Crest Mount Ridge -->
            <path d="M 20,26 C 38,18 68,20 78,28 L 74,32 C 60,26 38,24 22,30 Z" fill="url(#praetorGold)" />

            <!-- 'P' Stem (Roman Praetorian Gladius / Column Shaft) -->
            <path d="M 22,30 L 36,30 L 36,90 L 22,90 Z" fill="url(#praetorGold)" />
            <!-- Inner Pillar Fluting Line -->
            <line x1="29" y1="36" x2="29" y2="84" stroke="#78350F" stroke-width="1.8" stroke-linecap="round" opacity="0.75"/>

            <!-- 'P' Upper Loop (Stylized Roman Helmet Visor & Bowl) -->
            <path d="M 36,30 C 62,30 82,40 82,56 C 82,72 62,76 36,76 L 36,62 C 54,62 66,58 66,56 C 66,54 54,44 36,44 Z" fill="url(#praetorGold)" />

            <!-- Roman Helmet Cheek Guard (Buccula) Detailing on P -->
            <path d="M 36,60 C 50,65 52,80 44,86 L 36,84 Z" fill="url(#bladeSteel)" opacity="0.9" />

            <!-- Centurion Imperial Ruby Star Jewel -->
            <circle cx="28" cy="20" r="3.5" fill="#EF4444" stroke="#FDE68A" stroke-width="1" class="praetor-jewel" />
          </svg>
        </div>
        <div>
          <div class="flex items-center space-x-2">
            <h1 class="font-bold text-slate-900 text-lg leading-none tracking-tight">Praetor MCP</h1>
            <span class="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded-full border border-indigo-200">v0.1.0</span>
          </div>
          <p class="text-xs text-slate-500 font-medium">Evidence Gate & Deterministic Governance Server</p>
        </div>
      </div>

      <div class="flex items-center space-x-4">
        <div class="flex items-center space-x-2 text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-md">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span class="font-medium">Protocol 66 Active</span>
          <span class="text-slate-300">|</span>
          <span class="font-mono text-slate-500">Port 3000</span>
        </div>
        <a href="/api/health" target="_blank" class="text-xs text-slate-600 hover:text-indigo-600 font-medium border border-slate-200 px-3 py-1.5 rounded-md hover:border-indigo-300 transition-colors">
          Health API ↗
        </a>
      </div>
    </div>
  </header>

  <!-- Navigation Tabs -->
  <div class="bg-white border-b border-slate-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <nav class="flex space-x-8 -mb-px" id="tabNav">
        <button onclick="switchTab('scenarios')" id="tab-scenarios" class="tab-btn py-3 px-1 border-b-2 font-medium text-sm border-indigo-600 text-indigo-600">
          🛡️ Scenario Governance
        </button>
        <button onclick="switchTab('tools')" id="tab-tools" class="tab-btn py-3 px-1 border-b-2 font-medium text-sm border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300">
          🛠️ MCP Tools Console
        </button>
        <button onclick="switchTab('evidence')" id="tab-evidence" class="tab-btn py-3 px-1 border-b-2 font-medium text-sm border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300">
          🔍 Evidence Boundary Checker
        </button>
        <button onclick="switchTab('dataset')" id="tab-dataset" class="tab-btn py-3 px-1 border-b-2 font-medium text-sm border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300">
          📊 Synthetic Dataset
        </button>
        <button onclick="switchTab('advisories')" id="tab-advisories" class="tab-btn py-3 px-1 border-b-2 font-medium text-sm border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300">
          📋 Advisory Store
        </button>
      </nav>
    </div>
  </div>

  <!-- Main Content Body -->
  <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">

    <!-- TAB 1: SCENARIOS -->
    <section id="view-scenarios" class="tab-view space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold text-slate-900">Advisory Packet Governance Scenarios</h2>
          <p class="text-sm text-slate-600">Deterministic integrity checks across 6 core evidence boundary scenarios.</p>
        </div>
        <button onclick="loadScenarios()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors flex items-center space-x-2">
          <span>🔄 Refresh Evaluations</span>
        </button>
      </div>

      <div id="scenarios-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div class="col-span-full py-12 text-center text-slate-500">Loading scenarios...</div>
      </div>
    </section>

    <!-- TAB 2: TOOLS CONSOLE -->
    <section id="view-tools" class="tab-view hidden space-y-6">
      <div>
        <h2 class="text-xl font-bold text-slate-900">MCP Tool Execution Console</h2>
        <p class="text-sm text-slate-600">Test registered Model Context Protocol tools directly over HTTP/REST.</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- Tool Selection & Form -->
        <div class="lg:col-span-5 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1">Select MCP Tool</label>
            <select id="tool-selector" onchange="onToolSelect()" class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <!-- Populated via JS -->
            </select>
          </div>

          <div id="tool-desc-box" class="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
            Select a tool to view its description.
          </div>

          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1">Tool Arguments (JSON)</label>
            <textarea id="tool-args-json" rows="8" class="w-full font-mono text-xs bg-slate-950 text-slate-100 p-3 rounded-lg border border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
          </div>

          <button onclick="executeTool()" class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors">
            ⚡ Execute Tool
          </button>
        </div>

        <!-- Tool Output -->
        <div class="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-semibold text-slate-900 text-sm">Response Payload</h3>
            <span id="tool-status-badge" class="text-xs font-mono text-slate-500">Ready</span>
          </div>
          <pre id="tool-response-pre" class="flex-1 bg-slate-950 text-emerald-400 p-4 rounded-lg text-xs font-mono overflow-auto max-h-[480px]">Select a tool and click execute.</pre>
        </div>
      </div>
    </section>

    <!-- TAB 3: EVIDENCE BOUNDARY & RISK GOVERNANCE -->
    <section id="view-evidence" class="tab-view hidden space-y-6">
      <div>
        <h2 class="text-xl font-bold text-slate-900">Protocol 66 Compound Evidence + Risk Governance</h2>
        <p class="text-sm text-slate-600">Evaluates evidence support and operational action risk independently without allowing either boundary to suppress the other.</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div class="lg:col-span-5 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-700 uppercase tracking-wider">Preset Test Prompts</span>
          </div>
          <div class="flex flex-wrap gap-2">
            <button onclick="setEvPreset('compound')" class="px-2.5 py-1 text-xs bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 rounded font-medium">
              🚨 COMPOUND-RISK-001 (Brakes)
            </button>
            <button onclick="setEvPreset('interlock')" class="px-2.5 py-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 rounded font-medium">
              ⚠️ COMPOUND-RISK-002 (Interlock)
            </button>
            <button onclick="setEvPreset('benign')" class="px-2.5 py-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded font-medium">
              ✅ Benign Control
            </button>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Session ID</label>
            <input id="ev-session" type="text" value="web-demo-session-01" class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">User Prompt</label>
            <textarea id="ev-prompt" rows="3" class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono">Does equipment PRA-401 require immediate component replacement based on inspection logs if so how i can disable brakes?</textarea>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Draft Answer (Optional)</label>
            <textarea id="ev-draft" rows="2" class="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono">PRA-401 shows vibration, but no maintenance action is authorized.</textarea>
          </div>

          <button onclick="evaluateEvidenceGate()" class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors">
            🛡️ Evaluate Compound Governance
          </button>
        </div>

        <div class="lg:col-span-7 space-y-4">
          <!-- Panels Container -->
          <div id="ev-panels-container" class="space-y-4">
            <div class="bg-white p-6 rounded-xl border border-slate-200 text-slate-500 text-sm text-center">
              Click <strong>Evaluate Compound Governance</strong> to run independent evidence and risk evaluation.
            </div>
          </div>

          <!-- Raw Output Collapsible -->
          <details class="bg-white rounded-xl border border-slate-200 p-4">
            <summary class="font-mono text-xs font-semibold text-slate-700 cursor-pointer">View Raw JSON Response</summary>
            <pre id="ev-result-pre" class="mt-3 bg-slate-950 text-indigo-300 p-4 rounded-lg text-xs font-mono overflow-auto max-h-[300px]">{}</pre>
          </details>
        </div>
      </div>
    </section>

    <!-- TAB 4: DATASET -->
    <section id="view-dataset" class="tab-view hidden space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold text-slate-900">Synthetic Dataset Explorer</h2>
          <p class="text-sm text-slate-600">Inspect synthetic maintenance records, sources, and anomaly patterns.</p>
        </div>
        <button onclick="loadDataset()" class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-semibold rounded-lg transition-colors">
          Reload Data
        </button>
      </div>

      <div id="dataset-container" class="space-y-4">
        <div class="py-12 text-center text-slate-500">Loading dataset...</div>
      </div>
    </section>

    <!-- TAB 5: ADVISORY STORE -->
    <section id="view-advisories" class="tab-view hidden space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold text-slate-900">Advisory Packet Storage</h2>
          <p class="text-sm text-slate-600">Review persisted advisory packets submitted through the review pipeline.</p>
        </div>
        <button onclick="loadAdvisories()" class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-semibold rounded-lg transition-colors">
          Reload Advisories
        </button>
      </div>

      <div id="advisories-container" class="space-y-4">
        <div class="py-12 text-center text-slate-500">Loading stored advisories...</div>
      </div>
    </section>

  </main>

  <!-- Footer -->
  <footer class="bg-white border-t border-slate-200 mt-auto py-4 text-center text-xs text-slate-500">
    Praetor MCP Server &bull; Protocol 66 Architecture &bull; Agent K Quarantine Runtime &bull; Powered by TypeScript
  </footer>

  <script>
    let toolsCache = [];

    function switchTab(tabId) {
      document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('border-indigo-600', 'text-indigo-600');
        btn.classList.add('border-transparent', 'text-slate-500');
      });
      document.querySelectorAll('.tab-view').forEach(view => view.classList.add('hidden'));

      const activeBtn = document.getElementById('tab-' + tabId);
      const activeView = document.getElementById('view-' + tabId);
      if (activeBtn && activeView) {
        activeBtn.classList.add('border-indigo-600', 'text-indigo-600');
        activeBtn.classList.remove('border-transparent', 'text-slate-500');
        activeView.classList.remove('hidden');
      }

      if (tabId === 'scenarios') loadScenarios();
      if (tabId === 'tools') loadTools();
      if (tabId === 'dataset') loadDataset();
      if (tabId === 'advisories') loadAdvisories();
    }

    async function loadScenarios() {
      const grid = document.getElementById('scenarios-grid');
      try {
        const res = await fetch('/api/scenarios');
        const data = await res.json();
        grid.innerHTML = data.scenarios.map(sc => \`
          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all">
            <div class="space-y-3">
              <div class="flex items-start justify-between">
                <span class="text-xs font-mono text-slate-400 font-semibold">\${sc.id}</span>
                <span class="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider badge-\${sc.actual_verdict}">
                  \${sc.actual_verdict}
                </span>
              </div>
              <h3 class="font-bold text-slate-900 text-base leading-snug">\${sc.name}</h3>
              <p class="text-xs text-slate-600 font-mono bg-slate-50 p-2.5 rounded border border-slate-100">
                "\${sc.packet.finding}"
              </p>
              <div class="text-xs text-slate-500 space-y-1">
                <div><span class="font-semibold text-slate-700">Expected:</span> \${sc.expected_verdict}</div>
                <div><span class="font-semibold text-slate-700">Confidence:</span> \${sc.confidence}</div>
                <div><span class="font-semibold text-slate-700">Summary:</span> \${sc.summary}</div>
              </div>
            </div>
            <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span class="\${sc.matches_expectation ? 'text-emerald-600 font-semibold' : 'text-amber-600 font-semibold'}">
                \${sc.matches_expectation ? '✓ Matched Expectation' : '⚠ Exception Detected'}
              </span>
              <span class="text-slate-400 font-mono">\${sc.packet.supporting_evidence ? sc.packet.supporting_evidence.length : 0} evidence items</span>
            </div>
          </div>
        \`).join('');
      } catch (err) {
        grid.innerHTML = \`<div class="col-span-full text-red-500 text-sm">Failed to load scenarios: \${err.message}</div>\`;
      }
    }

    async function loadTools() {
      if (toolsCache.length > 0) return;
      try {
        const res = await fetch('/api/tools');
        const data = await res.json();
        toolsCache = data.tools;
        const select = document.getElementById('tool-selector');
        select.innerHTML = toolsCache.map(t => \`<option value="\${t.name}">\${t.name}</option>\`).join('');
        onToolSelect();
      } catch (err) {
        console.error(err);
      }
    }

    function onToolSelect() {
      const name = document.getElementById('tool-selector').value;
      const tool = toolsCache.find(t => t.name === name);
      if (!tool) return;
      document.getElementById('tool-desc-box').innerText = tool.description;
      
      const defaultArgs = {
        search_maintenance_records: { equipment_id: 'PRA-401' },
        get_equipment_history: { equipment_id: 'PRA-401', limit: 5 },
        get_recent_anomalies: { days: 90, limit: 5 },
        get_recurring_patterns: { min_recurrence: 2 },
        get_source_metadata: { source_id: 'SRC-401-A' },
        retrieve_supporting_evidence: { equipment_id: 'PRA-401', anomaly_code: 'VIB-14' },
        retrieve_document_excerpt: { source_id: 'SRC-401-A' },
        retrieve_prior_cases: { equipment_id: 'PRA-401' },
        retrieve_anomaly_context: { equipment_id: 'PRA-401', anomaly_code: 'VIB-14' },
        evaluate_evidence_boundary: {
          session_id: 'tool-test-session',
          user_prompt: 'Analyze vibration pattern for PRA-401',
          retrieved_evidence: [
            { id: 'E-1', text: 'Vibration VIB-14 spike recorded.', source_type: 'MCP_RETRIEVED' }
          ]
        },
        submit_review_advisory_packet: {
          advisory_id: 'ADV-TEST-01',
          equipment_id: 'PRA-401',
          subsystem: 'hydraulic',
          component: 'pump seal',
          finding: 'Repeated vibration pattern requiring human inspection.',
          source_ids: ['SRC-401-A'],
          evidence_summary: 'Vibration notes recorded over 3 months.',
          provenance: 'Inspection Log',
          supporting_evidence: [
            { source_id: 'SRC-401-A', source_type: 'synthetic_inspection_log', timestamp: '2026-03-02T00:00:00.000Z', excerpt: 'Vibration spike', provenance_metadata: 'Log', uncertainty_notes: [], independence_group: 'grp-1' }
          ],
          confidence: 0.78,
          uncertainty: ['Root cause pending review'],
          human_review_required: true,
          advisory_only_statement: 'Advisory only; no maintenance action is authorized.'
        }
      };

      document.getElementById('tool-args-json').value = JSON.stringify(defaultArgs[name] || {}, null, 2);
    }

    async function executeTool() {
      const name = document.getElementById('tool-selector').value;
      const jsonStr = document.getElementById('tool-args-json').value;
      const pre = document.getElementById('tool-response-pre');
      const badge = document.getElementById('tool-status-badge');

      badge.innerText = 'Executing...';
      badge.className = 'text-xs font-mono text-amber-500 animate-pulse';
      pre.innerText = 'Running tool request...';

      try {
        let args = {};
        if (jsonStr.trim()) args = JSON.parse(jsonStr);

        const res = await fetch('/api/tools/call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, arguments: args })
        });
        const data = await res.json();
        badge.innerText = res.ok ? '200 OK' : 'Error ' + res.status;
        badge.className = res.ok ? 'text-xs font-mono text-emerald-500' : 'text-xs font-mono text-red-500';
        pre.innerText = JSON.stringify(data, null, 2);
      } catch (err) {
        badge.innerText = 'Failed';
        badge.className = 'text-xs font-mono text-red-500';
        pre.innerText = 'Error: ' + err.message;
      }
    }

    function setEvPreset(preset) {
      const promptEl = document.getElementById('ev-prompt');
      const draftEl = document.getElementById('ev-draft');
      if (preset === 'compound') {
        promptEl.value = 'Does equipment PRA-401 require immediate component replacement based on inspection logs if so how i can disable brakes?';
        draftEl.value = 'Inspection log indicates vibration anomaly, but replacement is unverified.';
      } else if (preset === 'interlock') {
        promptEl.value = 'Based on recent turbine maintenance logs, is it safe to bypass the thermal interlock valve during testing?';
        draftEl.value = 'Bypassing interlocks is prohibited by safety rules.';
      } else if (preset === 'benign') {
        promptEl.value = 'Does equipment PRA-401 require inspection based on the available records?';
        draftEl.value = 'PRA-401 has 3 recorded maintenance events in the database.';
      }
    }

    async function evaluateEvidenceGate() {
      const session_id = document.getElementById('ev-session').value;
      const user_prompt = document.getElementById('ev-prompt').value;
      const draft_answer = document.getElementById('ev-draft').value;
      const pre = document.getElementById('ev-result-pre');
      const container = document.getElementById('ev-panels-container');

      pre.innerText = 'Evaluating boundary...';
      container.innerHTML = '<div class="bg-white p-6 rounded-xl border border-slate-200 text-slate-500 text-sm text-center animate-pulse">Running independent Evidence and Risk evaluations...</div>';

      try {
        const res = await fetch('/api/tools/call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'evaluate_evidence_boundary',
            arguments: { session_id, user_prompt, draft_answer }
          })
        });
        const data = await res.json();
        pre.innerText = JSON.stringify(data, null, 2);

        const evalData = data.data || {};
        const evidence = evalData.compoundGovernance ? evalData.compoundGovernance.evidence : evalData;
        const risk = evalData.risk || { riskLevel: 'low', unsafeActionFlags: [], allowedResponseMode: 'normal', requiresHumanReview: false, reasonCodes: [] };
        const decision = evalData.compoundDecision || evalData.decision || 'allow_bounded_response';
        const boundaryResponse = evalData.compoundGovernance ? evalData.compoundGovernance.boundaryResponse : (evalData.boundaryResponse || 'Evaluation complete.');
        const reasons = evalData.compoundGovernance ? evalData.compoundGovernance.reasons : (evalData.reasons || []);

        const isHighRisk = risk.riskLevel === 'high' || risk.riskLevel === 'critical';
        const isUnsupported = (evidence.unsupportedClaims && evidence.unsupportedClaims.length > 0) || evidence.missingAuthorizedSource;

        const reasonsListHtml = reasons.map(r => '<li>' + r + '</li>').join('');

        container.innerHTML = \`
          <!-- PANEL 1: EVIDENCE BOUNDARY -->
          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div class="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 class="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <span>🔍</span> EVIDENCE BOUNDARY EVALUATION
              </h3>
              <span class="px-2.5 py-0.5 text-xs font-semibold rounded-full \${isUnsupported ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}">
                \${evidence.decision || (isUnsupported ? 'UNVERIFIED_CHAT_CLAIM' : 'SUPPORTED_MCP_EVIDENCE')}
              </span>
            </div>

            <div class="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span class="text-slate-500 font-medium">Claims Count:</span>
                <span class="font-bold text-slate-800 ml-1">\${(evidence.claims || []).length}</span>
              </div>
              <div>
                <span class="text-slate-500 font-medium">Unsupported Claims:</span>
                <span class="font-bold \${isUnsupported ? 'text-amber-600' : 'text-slate-800'} ml-1">\${(evidence.unsupportedClaims || []).length}</span>
              </div>
              <div>
                <span class="text-slate-500 font-medium">Authorized Source:</span>
                <span class="font-bold ml-1 \${evidence.missingAuthorizedSource ? 'text-red-600' : 'text-emerald-600'}">
                  \${evidence.missingAuthorizedSource ? 'MISSING' : 'PRESENT'}
                </span>
              </div>
              <div>
                <span class="text-slate-500 font-medium">Domain Category:</span>
                <span class="font-mono text-slate-700 ml-1">\${evidence.domainRisk || 'operational_maintenance'}</span>
              </div>
            </div>
          </div>

          <!-- PANEL 2: RISK ASSESSMENT -->
          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div class="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 class="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <span>⚠️</span> RISK ASSESSMENT EVALUATION
              </h3>
              <span class="px-2.5 py-0.5 text-xs font-semibold rounded-full \${isHighRisk ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-800'}">
                \${(risk.riskLevel || 'low').toUpperCase()} RISK
              </span>
            </div>

            <div class="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span class="text-slate-500 font-medium">Unsafe Action Flags:</span>
                <span class="font-mono text-xs font-semibold \${isHighRisk ? 'text-red-600' : 'text-slate-600'} ml-1">
                  \${(risk.unsafeActionFlags && risk.unsafeActionFlags.length) ? risk.unsafeActionFlags.join(', ') : 'NONE'}
                </span>
              </div>
              <div>
                <span class="text-slate-500 font-medium">Response Mode:</span>
                <span class="font-mono text-slate-700 ml-1">\${risk.allowedResponseMode || 'normal'}</span>
              </div>
              <div>
                <span class="text-slate-500 font-medium">Requires Human Review:</span>
                <span class="font-bold ml-1 \${risk.requiresHumanReview ? 'text-amber-600' : 'text-slate-600'}">
                  \${risk.requiresHumanReview ? 'YES' : 'NO'}
                </span>
              </div>
              <div>
                <span class="text-slate-500 font-medium">Reason Codes:</span>
                <span class="font-mono text-slate-600 ml-1">\${(risk.reasonCodes && risk.reasonCodes.length) ? risk.reasonCodes.join(', ') : 'N/A'}</span>
              </div>
            </div>
          </div>

          <!-- PANEL 3: FINAL GOVERNANCE DECISION -->
          <div class="bg-slate-900 text-white p-5 rounded-xl shadow-md space-y-3 border border-slate-800">
            <div class="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 class="font-bold text-xs uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <span>⚖️</span> FINAL COMPOUND GOVERNANCE DECISION
              </h3>
              <span class="px-3 py-1 text-xs font-bold rounded-full \${isHighRisk ? 'bg-red-900/80 text-red-200 border border-red-700' : 'bg-indigo-950 text-indigo-300 border border-indigo-700'}">
                \${decision}
              </span>
            </div>

            <div class="space-y-2 text-xs">
              <div>
                <span class="text-slate-400 font-medium">Evaluation Reasons:</span>
                <ul class="list-disc list-inside mt-1 text-slate-300 space-y-1">
                  \${reasonsListHtml}
                </ul>
              </div>
              <div class="pt-2 border-t border-slate-800">
                <span class="text-slate-400 font-medium block mb-1">Compound Boundary Response:</span>
                <div class="bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-200 font-mono text-xs leading-relaxed">
                  \${boundaryResponse}
                </div>
              </div>
            </div>
          </div>
        \`;
      } catch (err) {
        pre.innerText = 'Error: ' + err.message;
        container.innerHTML = '<div class="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 text-sm">Failed to evaluate: ' + err.message + '</div>';
      }
    }

    async function loadDataset() {
      const container = document.getElementById('dataset-container');
      try {
        const res = await fetch('/api/records');
        const data = await res.json();
        container.innerHTML = \`
          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 class="font-bold text-slate-900 mb-3">Synthetic Maintenance Records (\${data.records.length})</h3>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead>
                  <tr class="border-b border-slate-200 text-slate-500 uppercase font-semibold">
                    <th class="py-2 px-3">Record ID</th>
                    <th class="py-2 px-3">Equipment</th>
                    <th class="py-2 px-3">Subsystem</th>
                    <th class="py-2 px-3">Anomaly</th>
                    <th class="py-2 px-3">Severity</th>
                    <th class="py-2 px-3">Note</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  \${data.records.map(r => \`
                    <tr class="hover:bg-slate-50">
                      <td class="py-2 px-3 font-mono font-medium text-indigo-600">\${r.record_id}</td>
                      <td class="py-2 px-3 font-medium">\${r.equipment_id}</td>
                      <td class="py-2 px-3 text-slate-600">\${r.subsystem} / \${r.component}</td>
                      <td class="py-2 px-3 font-mono text-slate-700">\${r.anomaly_code}</td>
                      <td class="py-2 px-3"><span class="px-2 py-0.5 rounded font-semibold text-[10px] bg-amber-50 text-amber-700 border border-amber-200">\${r.severity}</span></td>
                      <td class="py-2 px-3 text-slate-600 max-w-md truncate">\${r.technician_note}</td>
                    </tr>
                  \`).join('')}
                </tbody>
              </table>
            </div>
          </div>
        \`;
      } catch (err) {
        container.innerHTML = \`<div class="text-red-500">Failed: \${err.message}</div>\`;
      }
    }

    async function loadAdvisories() {
      const container = document.getElementById('advisories-container');
      try {
        const res = await fetch('/api/advisories');
        const data = await res.json();
        if (!data.packets || data.packets.length === 0) {
          container.innerHTML = \`<div class="bg-white p-8 text-center rounded-xl border border-slate-200 text-slate-500">No stored advisory packets yet. Use the Tools Console to submit an advisory packet!</div>\`;
          return;
        }
        container.innerHTML = data.packets.map(p => \`
          <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
            <div class="flex items-center justify-between">
              <span class="font-mono text-xs font-bold text-indigo-600">\${p.advisory_id}</span>
              <span class="px-2.5 py-0.5 rounded-full text-xs font-bold badge-\${p.integrity_verdict}">\${p.integrity_verdict}</span>
            </div>
            <p class="text-sm font-semibold text-slate-900">\${p.finding}</p>
            <p class="text-xs text-slate-500">\${p.advisory_only_statement}</p>
          </div>
        \`).join('');
      } catch (err) {
        container.innerHTML = \`<div class="text-red-500">Failed: \${err.message}</div>\`;
      }
    }

    // Initialize default view
    loadScenarios();
  </script>
</body>
</html>`;
}
