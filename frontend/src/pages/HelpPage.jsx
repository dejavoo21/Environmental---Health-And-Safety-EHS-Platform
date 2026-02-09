import { useEffect, useState } from 'react';
import api from '../api/client';
import { ErrorState, LoadingState } from '../components/States';

// P2-J11: Help page
const HelpPage = () => {
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [topicContent, setTopicContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadTopics = async () => {
      try {
        const res = await api.get('/help');
        setTopics(res.data.topics || []);
      } catch (err) {
        setError('Unable to load help content.');
      } finally {
        setLoading(false);
      }
    };

    loadTopics();
  }, []);

  const handleTopicClick = async (topic) => {
    setSelectedTopic(topic);
    setLoadingContent(true);
    setTopicContent(null);

    try {
      const res = await api.get(`/help/${topic.slug}`);
      setTopicContent(res.data);
    } catch (err) {
      setTopicContent({ content: 'Unable to load this help topic.' });
    } finally {
      setLoadingContent(false);
    }
  };

  const renderMarkdown = (content) => {
    // Simple markdown rendering for headers and paragraphs
    if (!content) return null;

    const lines = content.split('\n');
    const elements = [];
    let currentParagraph = [];
    let keyCounter = 0;

    const getKey = (prefix) => `${prefix}-${keyCounter++}`;

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        elements.push(
          <p key={getKey('p')}>{currentParagraph.join(' ')}</p>
        );
        currentParagraph = [];
      }
    };

    lines.forEach((line) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('# ')) {
        flushParagraph();
        elements.push(<h2 key={getKey('h2')}>{trimmed.slice(2)}</h2>);
      } else if (trimmed.startsWith('## ')) {
        flushParagraph();
        elements.push(<h3 key={getKey('h3')}>{trimmed.slice(3)}</h3>);
      } else if (trimmed.startsWith('### ')) {
        flushParagraph();
        elements.push(<h4 key={getKey('h4')}>{trimmed.slice(4)}</h4>);
      } else if (trimmed.startsWith('- ')) {
        flushParagraph();
        elements.push(<li key={getKey('li')}>{trimmed.slice(2)}</li>);
      } else if (trimmed.match(/^\d+\.\s/)) {
        flushParagraph();
        elements.push(<li key={getKey('li')}>{trimmed.replace(/^\d+\.\s/, '')}</li>);
      } else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
        flushParagraph();
        elements.push(<p key={getKey('strong')}><strong>{trimmed.slice(2, -2)}</strong></p>);
      } else if (trimmed === '') {
        flushParagraph();
      } else {
        currentParagraph.push(trimmed);
      }
    });

    flushParagraph();
    return elements;
  };

  if (loading) return <LoadingState message="Loading help..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="page help-page">
      <div className="help-layout">
        <div className="help-sidebar">
          <h3>Topics</h3>
          <ul className="help-topics">
            {topics.map((topic) => (
              <li
                key={topic.id}
                className={selectedTopic?.id === topic.id ? 'active' : ''}
                onClick={() => handleTopicClick(topic)}
              >
                <div className="topic-title">{topic.title}</div>
                <div className="topic-summary">{topic.summary}</div>
              </li>
            ))}
          </ul>
        </div>

        <div className="help-content">
          {!selectedTopic && (
            <div className="help-welcome">
              <h2>Welcome to Help</h2>
              <p>Select a topic from the sidebar to get started.</p>
              <div className="support-box">
                <h4>Need more help?</h4>
                <p>Contact support: <a href="mailto:support@company.com">support@company.com</a></p>
              </div>
            </div>
          )}

          {selectedTopic && loadingContent && (
            <LoadingState message="Loading topic..." />
          )}

          {selectedTopic && !loadingContent && topicContent && (
            <div className="help-article">
              <h2>{topicContent.title}</h2>
              <div className="article-content">
                {renderMarkdown(topicContent.content)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HelpPage;
