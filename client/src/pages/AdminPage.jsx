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
  const [question, setQuestion] = useState(initialQuestion)
  const [roadmap, setRoadmap] = useState({ topic: 'dsa', title: '', description: '', order: 0 })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadAdminData = async () => {
    setError('')
    try {
      const [dashboardRes, usersRes, questionsRes, progressRes, roadmapRes] = await Promise.all([
        adminAPI.dashboard(),
        adminAPI.getUsers(),
        adminAPI.getQuestions(),
        adminAPI.getProgress(),
        adminAPI.getRoadmap(),
      ])
      setDashboard(dashboardRes.data)
      setUsers(usersRes.data)
      setQuestions(questionsRes.data)
      setProgress(progressRes.data)
      setRoadmapItems(roadmapRes.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to load admin data')
    }
  }

  useEffect(() => {
    loadAdminData()
  }, [])

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

  const tabs = ['overview', 'users', 'questions', 'roadmap', 'progress']

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
