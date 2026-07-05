import React, { useEffect, useState } from 'react'
import { RefreshCw, Trash2 } from 'lucide-react'
import Navbar from '../components/ui/Navbar'
import Sidebar from '../components/ui/Sidebar'
import { useUIStore } from '../store/uiStore'
import { adminAPI } from '../services/api'

const initialQuestion = {
  topic: 'dsa',
  type: 'theory',
  difficulty: 'medium',
  questionText: '',
  answerText: '',
  starterCode: '',
}

const AdminPage = () => {
  const { darkMode, sidebarOpen } = useUIStore()
  const [activeTab, setActiveTab] = useState('overview')
  const [dashboard, setDashboard] = useState(null)
  const [users, setUsers] = useState([])
  const [questions, setQuestions] = useState([])
  const [progress, setProgress] = useState([])
  const [roadmapItems, setRoadmapItems] = useState([])
  const [monitoring, setMonitoring] = useState(null)
  const [monitoringWindow, setMonitoringWindow] = useState('15m')
  const [monitoringRefreshMs, setMonitoringRefreshMs] = useState(10000)
  const [monitoringPaused, setMonitoringPaused] = useState(false)
  const [selectedEndpointKey, setSelectedEndpointKey] = useState('')
  const [question, setQuestion] = useState(initialQuestion)
  const [roadmap, setRoadmap] = useState({ topic: 'dsa', title: '', description: '', order: 0 })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadMonitoring = async (options = {}) => {
    try {
      const params = {
        window: options.window || monitoringWindow,
      }

      const endpointKey = options.endpoint ?? selectedEndpointKey
      if (endpointKey) {
        params.endpoint = endpointKey
      }

      const response = await adminAPI.monitoring(params)
      setMonitoring(response.data)
    } catch {
      setError('Monitoring data unavailable right now.')
    }
  }

  const loadAdminData = async () => {
    setError('')

    const [dashboardRes, monitoringRes, usersRes, questionsRes, progressRes, roadmapRes] = await Promise.allSettled([
      adminAPI.dashboard(),
      adminAPI.monitoring({ window: monitoringWindow, ...(selectedEndpointKey ? { endpoint: selectedEndpointKey } : {}) }),
      adminAPI.getUsers(),
      adminAPI.getQuestions(),
      adminAPI.getProgress(),
      adminAPI.getRoadmap(),
    ])

    if (dashboardRes.status === 'fulfilled') setDashboard(dashboardRes.value.data)
    if (monitoringRes.status === 'fulfilled') setMonitoring(monitoringRes.value.data)
    if (usersRes.status === 'fulfilled') setUsers(usersRes.value.data)
    if (questionsRes.status === 'fulfilled') setQuestions(questionsRes.value.data)
    if (progressRes.status === 'fulfilled') setProgress(progressRes.value.data)
    if (roadmapRes.status === 'fulfilled') setRoadmapItems(roadmapRes.value.data)

    const failed = [dashboardRes, monitoringRes, usersRes, questionsRes, progressRes, roadmapRes]
      .filter((result) => result.status === 'rejected')

    if (failed.length > 0) {
      setError('Some admin data failed to load. Refresh to retry.')
    }
  }

  useEffect(() => {
    loadAdminData()
  }, [])

  useEffect(() => {
    if (activeTab !== 'monitoring' || monitoringPaused) return undefined

    const timer = setInterval(() => {
      loadMonitoring()
    }, monitoringRefreshMs)

    return () => clearInterval(timer)
  }, [activeTab, monitoringPaused, monitoringRefreshMs, monitoringWindow, selectedEndpointKey])

  useEffect(() => {
    if (activeTab === 'monitoring') {
      loadMonitoring({ window: monitoringWindow, endpoint: selectedEndpointKey })
    }
  }, [monitoringWindow, selectedEndpointKey])

  const runAction = async (action, success) => {
    setMessage('')
    setError('')
    try {
      await action()
      setMessage(success)
      await loadAdminData()
    } catch (err) {
      setError(err.response?.data?.error || 'Admin action failed')
    }
  }

  const submitQuestion = async (event) => {
    event.preventDefault()
    await runAction(async () => {
      await adminAPI.createQuestion(question)
      setQuestion(initialQuestion)
    }, 'Question added')
  }

  const submitRoadmap = async (event) => {
    event.preventDefault()
    await runAction(async () => {
      await adminAPI.createRoadmapItem(roadmap)
      setRoadmap({ topic: roadmap.topic, title: '', description: '', order: Number(roadmap.order) + 1 })
    }, 'Roadmap item added')
  }

  const tabs = ['overview', 'monitoring', 'users', 'questions', 'roadmap', 'progress']

  return (
    <div className={`h-screen flex flex-col ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className={`flex-1 ${sidebarOpen ? 'ml-64' : 'ml-20'} overflow-y-auto`}>
          <div className="mx-auto max-w-7xl p-8">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Manage users, questions, roadmaps, and progress.</p>
              </div>
              <button onClick={loadAdminData} className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>

            {(message || error) && (
              <p className={`mb-4 rounded px-3 py-2 text-sm ${error ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                {error || message}
              </p>
            )}

            <div className="mb-6 flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded px-4 py-2 text-sm font-medium capitalize ${activeTab === tab ? 'bg-blue-600 text-white' : darkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-800'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && <Overview dashboard={dashboard} darkMode={darkMode} />}
            {activeTab === 'monitoring' && (
              <Monitoring
                darkMode={darkMode}
                monitoring={monitoring}
                monitoringPaused={monitoringPaused}
                monitoringRefreshMs={monitoringRefreshMs}
                monitoringWindow={monitoringWindow}
                onChangePaused={setMonitoringPaused}
                onChangeRefreshMs={setMonitoringRefreshMs}
                onChangeWindow={setMonitoringWindow}
                onRefresh={() => loadMonitoring()}
                onSelectEndpoint={(key) => {
                  setSelectedEndpointKey(key)
                }}
                onCloseEndpoint={() => {
                  setSelectedEndpointKey('')
                  loadMonitoring({ endpoint: '' })
                }}
              />
            )}
            {activeTab === 'users' && <Users users={users} darkMode={darkMode} runAction={runAction} />}
            {activeTab === 'questions' && <Questions questions={questions} question={question} setQuestion={setQuestion} submitQuestion={submitQuestion} darkMode={darkMode} runAction={runAction} />}
            {activeTab === 'roadmap' && <Roadmap roadmap={roadmap} setRoadmap={setRoadmap} roadmapItems={roadmapItems} submitRoadmap={submitRoadmap} darkMode={darkMode} runAction={runAction} />}
            {activeTab === 'progress' && <Progress progress={progress} darkMode={darkMode} runAction={runAction} />}
          </div>
        </main>
      </div>
    </div>
  )
}

const Overview = ({ dashboard, darkMode }) => {
  const counts = dashboard?.counts || {}
  return (
    <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
      {Object.entries(counts).map(([key, value]) => (
        <div key={key} className={`rounded border p-5 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
          <div className="text-sm capitalize text-gray-500">{key.replace(/([A-Z])/g, ' $1')}</div>
          <div className="mt-2 text-3xl font-bold">{value}</div>
        </div>
      ))}
      <div className={`rounded border p-5 md:col-span-3 xl:col-span-4 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <div className="text-sm text-gray-500">Admin emails</div>
        <div className="mt-2 font-mono text-sm">{dashboard?.adminEmails?.join(', ') || 'Not loaded'}</div>
      </div>
    </div>
  )
}

const Monitoring = ({
  monitoring,
  darkMode,
  monitoringWindow,
  monitoringRefreshMs,
  monitoringPaused,
  onChangeWindow,
  onChangeRefreshMs,
  onChangePaused,
  onRefresh,
  onSelectEndpoint,
  onCloseEndpoint,
}) => {
  const totals = monitoring?.totals || {}
  const latency = monitoring?.latencyMs || {}
  const statusCodes = monitoring?.statusCodes || {}
  const topEndpoints = monitoring?.topEndpoints || []
  const requestSeries = monitoring?.series?.requests || []
  const groqSeries = monitoring?.series?.groq || []
  const containerSeries = monitoring?.series?.containers || []
  const groqOps = monitoring?.groq?.byOperation || []
  const containerOps = monitoring?.containers?.byLanguage || []
  const dockerChecks = monitoring?.containers?.dockerChecks || {}
  const runtime = monitoring?.runtime || {}
  const endpointDetail = monitoring?.endpointDetail || null

  return (
    <div className="space-y-6">
      <div className={`rounded border p-4 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-gray-500">Window</span>
            <select
              value={monitoringWindow}
              onChange={(event) => onChangeWindow(event.target.value)}
              className={`rounded border px-3 py-2 ${darkMode ? 'border-gray-600 bg-gray-900' : 'border-gray-300 bg-white'}`}
            >
              <option value="5m">Last 5m</option>
              <option value="15m">Last 15m</option>
              <option value="1h">Last 1h</option>
              <option value="6h">Last 6h</option>
              <option value="24h">Last 24h</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-gray-500">Refresh</span>
            <select
              value={String(monitoringRefreshMs)}
              onChange={(event) => onChangeRefreshMs(Number(event.target.value))}
              className={`rounded border px-3 py-2 ${darkMode ? 'border-gray-600 bg-gray-900' : 'border-gray-300 bg-white'}`}
            >
              <option value="5000">5s</option>
              <option value="10000">10s</option>
              <option value="30000">30s</option>
              <option value="60000">60s</option>
            </select>
          </label>

          <button
            type="button"
            onClick={() => onChangePaused(!monitoringPaused)}
            className={`rounded px-4 py-2 text-sm font-medium ${monitoringPaused ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'}`}
          >
            {monitoringPaused ? 'Paused' : 'Live'}
          </button>

          <button
            type="button"
            onClick={onRefresh}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Refresh Now
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard darkMode={darkMode} label="Total Requests" value={totals.requests || 0} />
        <MetricCard darkMode={darkMode} label="API Requests" value={totals.apiRequests || 0} />
        <MetricCard darkMode={darkMode} label="Errors" value={totals.errors || 0} />
        <MetricCard darkMode={darkMode} label="GROQ Calls" value={totals.groqCalls || 0} />
        <MetricCard darkMode={darkMode} label="Container Runs" value={totals.containerRuns || 0} />
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard darkMode={darkMode} label="Uptime (s)" value={monitoring?.uptimeSeconds || 0} />
        <MetricCard darkMode={darkMode} label="Started At" value={monitoring?.startedAt || 'unknown'} />
        <MetricCard darkMode={darkMode} label="Active Requests" value={runtime.activeRequests || 0} />
        <MetricCard darkMode={darkMode} label="Peak Concurrency" value={runtime.peakActiveRequests || 0} />
        <MetricCard darkMode={darkMode} label="CPU %" value={runtime.cpuUsagePercent || 0} />
        <MetricCard darkMode={darkMode} label="Event Loop Lag (ms)" value={runtime.eventLoopLagMs || 0} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard darkMode={darkMode} label="RSS MB" value={runtime.memoryMb?.rss || 0} />
        <MetricCard darkMode={darkMode} label="Heap Used MB" value={runtime.memoryMb?.heapUsed || 0} />
        <MetricCard darkMode={darkMode} label="Heap Total MB" value={runtime.memoryMb?.heapTotal || 0} />
        <MetricCard darkMode={darkMode} label="External MB" value={runtime.memoryMb?.external || 0} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard darkMode={darkMode} label="Avg Latency (ms)" value={latency.avg || 0} />
        <MetricCard darkMode={darkMode} label="P50 Latency (ms)" value={latency.p50 || 0} />
        <MetricCard darkMode={darkMode} label="P95 Latency (ms)" value={latency.p95 || 0} />
        <MetricCard darkMode={darkMode} label="Max Latency (ms)" value={latency.max || 0} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <LineChart
          darkMode={darkMode}
          title="Requests and Errors Over Time"
          points={requestSeries}
          lines={[
            { key: 'requests', color: '#3b82f6', label: 'Requests' },
            { key: 'errors', color: '#ef4444', label: 'Errors' },
            { key: 'apiRequests', color: '#10b981', label: 'API Requests' },
          ]}
        />
        <LineChart
          darkMode={darkMode}
          title="Latency Over Time"
          points={requestSeries}
          lines={[
            { key: 'avgMs', color: '#f59e0b', label: 'Avg ms' },
            { key: 'p95Ms', color: '#8b5cf6', label: 'P95 ms' },
          ]}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <LineChart
          darkMode={darkMode}
          title="GROQ Call Activity"
          points={groqSeries}
          lines={[
            { key: 'requests', color: '#06b6d4', label: 'Calls' },
            { key: 'errors', color: '#ef4444', label: 'Errors' },
            { key: 'p95Ms', color: '#a855f7', label: 'P95 ms' },
          ]}
        />
        <LineChart
          darkMode={darkMode}
          title="Container Run Activity"
          points={containerSeries}
          lines={[
            { key: 'requests', color: '#22c55e', label: 'Runs' },
            { key: 'errors', color: '#ef4444', label: 'Errors' },
            { key: 'p95Ms', color: '#f97316', label: 'P95 ms' },
          ]}
        />
      </div>

      <DataPanel title="Status Codes" darkMode={darkMode}>
        {Object.keys(statusCodes).length === 0 ? (
          <div className="text-sm text-gray-500">No traffic yet.</div>
        ) : (
          Object.entries(statusCodes).map(([code, count]) => (
            <Row key={code} darkMode={darkMode}>
              <div className="font-medium">HTTP {code}</div>
              <div className="text-sm text-gray-500">{count} responses</div>
            </Row>
          ))
        )}
      </DataPanel>

      <DataPanel title="Top API Endpoints" darkMode={darkMode}>
        {topEndpoints.map((item) => (
          <Row key={`${item.method}-${item.path}`} darkMode={darkMode}>
            <div>
              <div className="font-medium">{item.method} {item.path}</div>
              <div className="text-sm text-gray-500">
                calls: {item.count} · avg: {item.avgMs}ms · p95: {item.p95Ms}ms · errors: {item.errors}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-gray-500">last: {item.lastStatusCode || 'n/a'}</div>
              <button
                type="button"
                onClick={() => onSelectEndpoint(item.key)}
                className="rounded bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700"
              >
                Drilldown
              </button>
            </div>
          </Row>
        ))}
      </DataPanel>

      <div className="grid gap-6 xl:grid-cols-2">
        <DataPanel title="GROQ Operations" darkMode={darkMode}>
          {groqOps.map((item) => (
            <Row key={item.name} darkMode={darkMode}>
              <div>
                <div className="font-medium">{item.name}</div>
                <div className="text-sm text-gray-500">
                  calls: {item.count} · avg: {item.avgMs}ms · p95: {item.p95Ms}ms · error rate: {item.errorRate}%
                </div>
              </div>
            </Row>
          ))}
        </DataPanel>

        <DataPanel title="Container Operations" darkMode={darkMode}>
          {containerOps.map((item) => (
            <Row key={item.name} darkMode={darkMode}>
              <div>
                <div className="font-medium">{item.name}{item.isDatabase ? ' · db' : ''}</div>
                <div className="text-sm text-gray-500">
                  runs: {item.count} · avg: {item.avgMs}ms · p95: {item.p95Ms}ms · error rate: {item.errorRate}%
                </div>
              </div>
            </Row>
          ))}

          <Row darkMode={darkMode}>
            <div>
              <div className="font-medium">Docker Availability</div>
              <div className="text-sm text-gray-500">
                checks: {dockerChecks.totalChecks || 0} · availability: {dockerChecks.availabilityRate || 0}%
              </div>
            </div>
          </Row>
        </DataPanel>
      </div>

      {endpointDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className={`w-full max-w-4xl rounded-lg border p-5 ${darkMode ? 'border-gray-700 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-900'}`}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold">Endpoint Drilldown</h3>
                <p className="text-sm text-gray-500">{endpointDetail.method} {endpointDetail.path}</p>
              </div>
              <button type="button" onClick={onCloseEndpoint} className="rounded bg-gray-600 px-3 py-2 text-sm text-white hover:bg-gray-700">Close</button>
            </div>

            <div className="mb-4 grid gap-4 md:grid-cols-4">
              <MetricCard darkMode={darkMode} label="Calls" value={endpointDetail.count || 0} />
              <MetricCard darkMode={darkMode} label="Errors" value={endpointDetail.errors || 0} />
              <MetricCard darkMode={darkMode} label="Avg Latency" value={endpointDetail.avgMs || 0} />
              <MetricCard darkMode={darkMode} label="P95 Latency" value={endpointDetail.p95Ms || 0} />
            </div>

            <LineChart
              darkMode={darkMode}
              title="Endpoint Latency and Calls"
              points={endpointDetail.timeline || []}
              lines={[
                { key: 'requests', color: '#3b82f6', label: 'Calls' },
                { key: 'errors', color: '#ef4444', label: 'Errors' },
                { key: 'p95Ms', color: '#8b5cf6', label: 'P95 ms' },
              ]}
            />
          </div>
        </div>
      )}
    </div>
  )
}

const MetricCard = ({ darkMode, label, value }) => (
  <div className={`rounded border p-5 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
    <div className="text-sm text-gray-500">{label}</div>
    <div className="mt-2 text-3xl font-bold">{value}</div>
  </div>
)

const LineChart = ({ darkMode, title, points, lines }) => {
  const width = 760
  const height = 220
  const chartLeft = 36
  const chartTop = 18
  const chartWidth = width - 56
  const chartHeight = height - 40
  const safePoints = points || []

  const values = safePoints.flatMap((point) => lines.map((line) => Number(point[line.key] || 0)))
  const maxValue = Math.max(1, ...values)

  const getX = (index) => {
    if (safePoints.length <= 1) return chartLeft
    return chartLeft + (index / (safePoints.length - 1)) * chartWidth
  }

  const getY = (value) => chartTop + chartHeight - (Number(value || 0) / maxValue) * chartHeight

  const renderPath = (line) => {
    const coords = safePoints.map((point, index) => `${getX(index)},${getY(point[line.key])}`)
    return coords.join(' ')
  }

  return (
    <section className={`rounded border p-4 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="flex flex-wrap gap-2 text-xs">
          {lines.map((line) => (
            <span key={line.key} className="inline-flex items-center gap-1 rounded bg-gray-500/15 px-2 py-1">
              <span style={{ backgroundColor: line.color }} className="inline-block h-2 w-2 rounded-full" />
              {line.label}
            </span>
          ))}
        </div>
      </div>

      {safePoints.length < 2 ? (
        <div className="text-sm text-gray-500">Not enough data yet.</div>
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full">
          <line x1={chartLeft} y1={chartTop + chartHeight} x2={chartLeft + chartWidth} y2={chartTop + chartHeight} stroke={darkMode ? '#374151' : '#d1d5db'} strokeWidth="1" />
          <line x1={chartLeft} y1={chartTop} x2={chartLeft} y2={chartTop + chartHeight} stroke={darkMode ? '#374151' : '#d1d5db'} strokeWidth="1" />

          {lines.map((line) => (
            <polyline
              key={line.key}
              fill="none"
              stroke={line.color}
              strokeWidth="2"
              points={renderPath(line)}
            />
          ))}
        </svg>
      )}
    </section>
  )
}

const Users = ({ users, darkMode, runAction }) => (
  <DataPanel title="Users" darkMode={darkMode}>
    {users.map((user) => (
      <Row key={user.id} darkMode={darkMode}>
        <div>
          <div className="font-medium">{user.name || user.email}</div>
          <div className="text-sm text-gray-500">{user.email}{user.isAdmin ? ' · admin' : ''}</div>
        </div>
        <div className="flex gap-2">
          <DangerButton onClick={() => runAction(() => adminAPI.clearUserProgress(user.id), 'User progress cleared')}>Clear Progress</DangerButton>
          <IconDanger onClick={() => runAction(() => adminAPI.deleteUser(user.id), 'User deleted')} />
        </div>
      </Row>
    ))}
  </DataPanel>
)

const Questions = ({ questions, question, setQuestion, submitQuestion, darkMode, runAction }) => (
  <div className="grid gap-6 xl:grid-cols-2">
    <QuestionForm question={question} setQuestion={setQuestion} submitQuestion={submitQuestion} darkMode={darkMode} />
    <DataPanel title="Questions" darkMode={darkMode}>
      {questions.map((item) => (
        <Row key={item.id} darkMode={darkMode}>
          <div>
            <div className="font-medium">{item.questionText}</div>
            <div className="text-sm text-gray-500">{item.topic} · {item.type} · {item.difficulty}</div>
          </div>
          <IconDanger onClick={() => runAction(() => adminAPI.deleteQuestion(item.id), 'Question deleted')} />
        </Row>
      ))}
    </DataPanel>
  </div>
)

const Roadmap = ({ roadmap, setRoadmap, roadmapItems, submitRoadmap, darkMode, runAction }) => (
  <div className="grid gap-6 xl:grid-cols-2">
    <RoadmapForm roadmap={roadmap} setRoadmap={setRoadmap} submitRoadmap={submitRoadmap} darkMode={darkMode} />
    <DataPanel title="Roadmap Items" darkMode={darkMode}>
      {roadmapItems.map((item) => (
        <Row key={item.id} darkMode={darkMode}>
          <div>
            <div className="font-medium">{item.title}</div>
            <div className="text-sm text-gray-500">{item.topic} · order {item.order}</div>
          </div>
          <IconDanger onClick={() => runAction(() => adminAPI.deleteRoadmapItem(item.id), 'Roadmap item deleted')} />
        </Row>
      ))}
    </DataPanel>
  </div>
)

const Progress = ({ progress, darkMode, runAction }) => (
  <DataPanel title="Progress" darkMode={darkMode}>
    {progress.map((item) => (
      <Row key={item.id} darkMode={darkMode}>
        <div>
          <div className="font-medium">{item.topic} · {item.stepName}</div>
          <div className="text-sm text-gray-500">{item.status} · {item.user?.email || 'unknown user'}</div>
        </div>
        <IconDanger onClick={() => runAction(() => adminAPI.deleteProgress(item.id), 'Progress deleted')} />
      </Row>
    ))}
  </DataPanel>
)

const QuestionForm = ({ question, setQuestion, submitQuestion, darkMode }) => (
  <form onSubmit={submitQuestion} className={`rounded border p-5 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
    <h2 className="mb-4 text-xl font-semibold">Add Question</h2>
    <AdminInput label="Topic" value={question.topic} onChange={(value) => setQuestionField(setQuestion, 'topic', value)} />
    <div className="mb-4 grid grid-cols-2 gap-3">
      <AdminSelect label="Type" value={question.type} options={['theory', 'coding', 'interview']} onChange={(value) => setQuestionField(setQuestion, 'type', value)} />
      <AdminSelect label="Difficulty" value={question.difficulty} options={['easy', 'medium', 'hard']} onChange={(value) => setQuestionField(setQuestion, 'difficulty', value)} />
    </div>
    <AdminText label="Question" value={question.questionText} onChange={(value) => setQuestionField(setQuestion, 'questionText', value)} />
    <AdminText label="Answer" value={question.answerText} onChange={(value) => setQuestionField(setQuestion, 'answerText', value)} />
    <AdminText label="Starter code" value={question.starterCode} onChange={(value) => setQuestionField(setQuestion, 'starterCode', value)} required={false} />
    <button className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">Add Question</button>
  </form>
)

const RoadmapForm = ({ roadmap, setRoadmap, submitRoadmap, darkMode }) => (
  <form onSubmit={submitRoadmap} className={`rounded border p-5 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
    <h2 className="mb-4 text-xl font-semibold">Add Roadmap Item</h2>
    <AdminInput label="Topic" value={roadmap.topic} onChange={(value) => setRoadmapField(setRoadmap, 'topic', value)} />
    <AdminInput label="Order" type="number" value={roadmap.order} onChange={(value) => setRoadmapField(setRoadmap, 'order', value)} />
    <AdminInput label="Title" value={roadmap.title} onChange={(value) => setRoadmapField(setRoadmap, 'title', value)} />
    <AdminText label="Description" value={roadmap.description} onChange={(value) => setRoadmapField(setRoadmap, 'description', value)} />
    <button className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">Add Roadmap Item</button>
  </form>
)

const setQuestionField = (setQuestion, key, value) => setQuestion((current) => ({ ...current, [key]: value }))
const setRoadmapField = (setRoadmap, key, value) => setRoadmap((current) => ({ ...current, [key]: value }))

const DataPanel = ({ title, darkMode, children }) => (
  <section className={`rounded border p-5 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
    <h2 className="mb-4 text-xl font-semibold">{title}</h2>
    <div className="space-y-3">{React.Children.count(children) ? children : <div className="text-sm text-gray-500">No records.</div>}</div>
  </section>
)

const Row = ({ darkMode, children }) => (
  <div className={`flex items-center justify-between gap-4 rounded border p-3 ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>{children}</div>
)

const DangerButton = ({ children, onClick }) => (
  <button type="button" onClick={onClick} className="rounded bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700">{children}</button>
)

const IconDanger = ({ onClick }) => (
  <button type="button" onClick={onClick} className="rounded bg-red-600 p-2 text-white hover:bg-red-700" title="Delete">
    <Trash2 size={16} />
  </button>
)

const AdminInput = ({ label, value, onChange, type = 'text' }) => (
  <label className="mb-4 block">
    <span className="mb-2 block text-sm font-medium">{label}</span>
    <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded border border-gray-700 bg-transparent px-3 py-2 outline-none focus:border-blue-500" required />
  </label>
)

const AdminText = ({ label, value, onChange, required = true }) => (
  <label className="mb-4 block">
    <span className="mb-2 block text-sm font-medium">{label}</span>
    <textarea value={value} onChange={(event) => onChange(event.target.value)} className="min-h-28 w-full rounded border border-gray-700 bg-transparent px-3 py-2 outline-none focus:border-blue-500" required={required} />
  </label>
)

const AdminSelect = ({ label, value, options, onChange }) => (
  <label className="block">
    <span className="mb-2 block text-sm font-medium">{label}</span>
    <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded border border-gray-700 bg-gray-900 px-3 py-2 outline-none focus:border-blue-500">
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  </label>
)

export default AdminPage
