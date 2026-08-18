import { Link } from 'react-router-dom'
import './App.css'

const tools = [
  {
    path: '/startlist-generator',
    name: 'Startlist Generator',
    description: 'Upload, edit, and download CSV startlists in your browser.',
  },
] as const

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Admin Tools</h1>
        <p className="subtitle">Browser-based utilities for event administration.</p>
      </header>

      <main className="app-main">
        <ul className="tool-grid">
          {tools.map((tool) => (
            <li key={tool.path}>
              <Link to={tool.path} className="tool-tile">
                <span className="tool-tile-name">{tool.name}</span>
                <span className="tool-tile-description">{tool.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}

export default App
