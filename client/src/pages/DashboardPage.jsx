import React, { useEffect, useState } from 'react'
import { useUIStore } from '../store/uiStore'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/ui/Navbar'
import Sidebar from '../components/ui/Sidebar'
import TopicCard from '../components/interview/TopicCard'
import { progressAPI, questionsAPI } from '../services/api'

const topics = [
  'dsa',
  'python',
  'javascript',
  'java',
  'system_design',
  'dbms',
  'os',
  'networking',
  'react',
  'nodejs',
  'sql',
  'devops',
]

const DashboardPage = () => {
  const { darkMode, sidebarOpen } = useUIStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [topicStats, setTopicStats] = useState({})
  const [progressByTopic, setProgressByTopic] = useState({})

  const requireLogin = (path) => {
    if (user) {
      navigate(path)
      return
    }

    navigate('/login', { state: { from: { pathname: path } } })
  }

  useEffect(() => {
    const loadStats = async () => {
      const stats = {}
      for (const topic of topics) {
        try {
          const res = await questionsAPI.getQuestionsByTopic(topic)
          const questions = Array.isArray(res.data) ? res.data : []
          stats[topic] = {
            total: questions.length,
            easy: questions.filter(q => q.difficulty === 'easy').length,
            medium: questions.filter(q => q.difficulty === 'medium').length,
            hard: questions.filter(q => q.difficulty === 'hard').length,
          }
        } catch (error) {
          stats[topic] = { total: 0, easy: 0, medium: 0, hard: 0 }
        }
      }
      setTopicStats(stats)

      if (user) {
        try {
          const progressRes = await progressAPI.getAllProgress()
          const grouped = {}
          progressRes.data.forEach((item) => {
            if (!grouped[item.topic]) grouped[item.topic] = []
            grouped[item.topic].push(item)
          })
          setProgressByTopic(grouped)
        } catch (error) {
          setProgressByTopic({})
        }
      }
    }

    loadStats()
  }, [user])

  return (
    <div className={`h-screen flex flex-col ${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className={`flex-1 ${sidebarOpen ? 'ml-64' : 'ml-20'} overflow-y-auto`}>
          <div className="p-8 max-w-7xl mx-auto">
            <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
            <p className="text-gray-400 mb-8">Select a topic to start preparing</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topics.map((topic) => (
                <TopicCard
                  key={topic}
                  topic={topic.replace(/_/g, ' ').toUpperCase()}
                  questionCount={topicStats[topic]?.total || 0}
                  difficulty={{
                    easy: topicStats[topic]?.easy || 0,
                    medium: topicStats[topic]?.medium || 0,
                    hard: topicStats[topic]?.hard || 0,
                  }}
                  progress={topicProgress(progressByTopic[topic])}
                  onClick={() => requireLogin(`/topics/${topic}`)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function topicProgress(items = []) {
  const steps = ['theory', 'coding', 'interview', 'roadmap']
  const done = steps.filter((step) => items.some((item) => item.stepName === step && item.status === 'done')).length
  return Math.round((done / steps.length) * 100)
}

export default DashboardPage
