import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { BookOpen, CheckCircle2, Code2, ClipboardList, Map } from 'lucide-react'
import Navbar from '../components/ui/Navbar'
import Sidebar from '../components/ui/Sidebar'
import CodingCard from '../components/interview/CodingCard'
import TheoryCard from '../components/interview/TheoryCard'
import { useUIStore } from '../store/uiStore'
import { progressAPI, questionsAPI } from '../services/api'

const tabs = [
  { key: 'theory', label: 'Theory', icon: BookOpen },
  { key: 'coding', label: 'Coding', icon: Code2 },
  { key: 'interview', label: 'Interview', icon: ClipboardList },
  { key: 'roadmap', label: 'Roadmap', icon: Map },
]

const TopicPage = () => {
  const { topic } = useParams()
  const [searchParams] = useSearchParams()
  const { darkMode, sidebarOpen } = useUIStore()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'theory')
  const [questions, setQuestions] = useState([])
  const [roadmap, setRoadmap] = useState([])
  const [progress, setProgress] = useState({})
  const [loading, setLoading] = useState(true)

  const title = useMemo(() => topic.replace(/_/g, ' ').toUpperCase(), [topic])

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && tabs.some((item) => item.key === tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [questionRes, roadmapRes, progressRes] = await Promise.all([
          questionsAPI.getQuestionsByTopic(topic),
          questionsAPI.getRoadmap(topic),
          progressAPI.getAllProgress(),
        ])

        setQuestions(Array.isArray(questionRes.data) ? questionRes.data : [])
        setRoadmap(Array.isArray(roadmapRes.data) ? roadmapRes.data : [])
        setProgress(
          Object.fromEntries(
            progressRes.data
              .filter((item) => item.topic === topic)
              .map((item) => [item.stepName, item.status])
          )
        )
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [topic])

  const markDone = async (stepName) => {
    const res = await progressAPI.updateProgress(topic, stepName, { status: 'done' })
    setProgress((current) => ({ ...current, [res.data.stepName]: res.data.status }))
  }

  const filteredQuestions = questions.filter((question) => {
    if (activeTab === 'roadmap') return false
    return (question.type || 'theory') === activeTab
  })

  return (
    <div className={`h-screen flex flex-col ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className={`flex-1 ${sidebarOpen ? 'ml-64' : 'ml-20'} overflow-y-auto`}>
          <div className="mx-auto max-w-6xl p-8">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold">{title}</h1>
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Study the topic, practice coding, review interview prompts, and track progress.
                </p>
              </div>
              <button
                type="button"
                onClick={() => markDone(activeTab)}
                className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <CheckCircle2 size={18} />
                Mark {tabs.find((tab) => tab.key === activeTab)?.label} Done
              </button>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const done = progress[tab.key] === 'done'
                return (
                  <button
                    type="button"
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center justify-between rounded border px-4 py-3 text-left ${
                      activeTab === tab.key
                        ? 'border-blue-500 bg-blue-600 text-white'
                        : darkMode
                          ? 'border-gray-700 bg-gray-800'
                          : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon size={18} />
                      {tab.label}
                    </span>
                    {done && <CheckCircle2 size={18} />}
                  </button>
                )
              })}
            </div>

            {loading ? (
              <div className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Loading topic...</div>
            ) : activeTab === 'roadmap' ? (
              <div className="space-y-3">
                {roadmap.length === 0 && <EmptyState label="No roadmap items have been added yet." />}
                {roadmap.map((item, index) => (
                  <div key={item.id} className={`rounded border p-4 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                    <div className="mb-2 text-sm font-semibold text-blue-500">Step {index + 1}</div>
                    <h2 className="text-xl font-semibold">{item.title}</h2>
                    <p className={darkMode ? 'mt-2 text-gray-300' : 'mt-2 text-gray-700'}>{item.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredQuestions.length === 0 && <EmptyState label="No questions have been added for this section yet." />}
                {filteredQuestions.map((question) => {
                  // Use question.question for new template format, fallback to questionText for old format
                  const cardData = {
                    ...question,
                    question: question.title || question.question || question.questionText,
                    explanation: question.explanation || question.answerText,
                    code: question.code || question.starterCode,
                    tags: question.tags || [question.difficulty || 'Medium'].filter(Boolean),
                  }
                  return activeTab === 'coding' ? (
                    <CodingCard key={question.id || question.questionText} question={cardData} />
                  ) : (
                    <TheoryCard key={question.id || question.questionText} question={cardData} />
                  )
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

const EmptyState = ({ label }) => (
  <div className="rounded border border-dashed border-gray-500 p-8 text-center text-gray-500">{label}</div>
)

export default TopicPage
