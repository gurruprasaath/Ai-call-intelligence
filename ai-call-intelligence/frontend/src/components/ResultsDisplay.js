import React from 'react';
import { 
  CheckSquare, 
  Calendar, 
  User, 
  AlertTriangle,
  Clock,
  Target,
  TrendingUp,
  Lightbulb
} from 'lucide-react';
import Classification from './Classification';

const ConversationSummary = ({ summary }) => {
  if (!summary || summary.length === 0) {
    return (
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Conversation Summary
        </h3>
        <p className="text-gray-500 dark:text-gray-400">No summary available</p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center space-x-2 mb-4">
        <CheckSquare className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Conversation Summary
        </h3>
      </div>
      
      <ul className="space-y-3">
        {summary.map((point, index) => (
          <li key={index} className="flex items-start space-x-3">
            <div className="w-2 h-2 bg-primary-600 dark:text-primary-400 rounded-full mt-2 flex-shrink-0"></div>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {point}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
};

const KeyDecisions = ({ decisions }) => {
  if (!decisions || decisions.length === 0) {
    return (
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Key Decisions
        </h3>
        <p className="text-gray-500 dark:text-gray-400">No decisions recorded</p>
      </div>
    );
  }

  const getConfidenceColor = (confidence) => {
    switch (confidence?.toLowerCase()) {
      case 'high':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Target className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Key Decisions
        </h3>
      </div>
      
      <div className="space-y-4">
        {decisions.map((decision, index) => (
          <div key={index} className="border-l-4 border-primary-200 dark:border-primary-800 pl-4 py-2">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium text-gray-900 dark:text-white">
                {decision.decision}
              </h4>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getConfidenceColor(decision.confidence)}`}>
                {decision.confidence}
              </span>
            </div>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {decision.reasoning}
            </p>
            
            {decision.participants && decision.participants.length > 0 && (
              <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-500">
                <User className="w-3 h-3" />
                <span>Participants: {decision.participants.join(', ')}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const KeyPoints = ({ keyPoints }) => {
  if (!keyPoints || keyPoints.length === 0) {
    return (
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Key Points
        </h3>
        <p className="text-gray-500 dark:text-gray-400">No key points identified</p>
      </div>
    );
  }

  const getImportanceColor = (importance) => {
    switch (importance?.toLowerCase()) {
      case 'high':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'discussion point': 'text-purple-600 dark:text-purple-400',
      'budget planning': 'text-green-600 dark:text-green-400',
      'marketing strategy': 'text-orange-600 dark:text-orange-400',
      'technical achievement': 'text-blue-600 dark:text-blue-400',
      'technical challenge': 'text-red-600 dark:text-red-400',
      'progress update': 'text-indigo-600 dark:text-indigo-400',
      'resource planning': 'text-yellow-600 dark:text-yellow-400',
      'team coordination': 'text-pink-600 dark:text-pink-400'
    };
    return colors[category?.toLowerCase()] || 'text-gray-600 dark:text-gray-400';
  };

  return (
    <div className="card p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Lightbulb className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Key Points
        </h3>
      </div>
      
      <div className="space-y-3">
        {keyPoints.map((keyPoint, index) => (
          <div key={index} className="border-l-4 border-blue-200 dark:border-blue-800 pl-4 py-2">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium text-gray-900 dark:text-white">
                {keyPoint.point}
              </h4>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getImportanceColor(keyPoint.importance)}`}>
                {keyPoint.importance}
              </span>
            </div>
            
            {keyPoint.category && (
              <div className="flex items-center space-x-1 text-xs">
                <span className="text-gray-500 dark:text-gray-500">Category:</span>
                <span className={getCategoryColor(keyPoint.category)}>
                  {keyPoint.category}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const ActionItems = ({ actionItems }) => {
  if (!actionItems || actionItems.length === 0) {
    return (
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Action Items
        </h3>
        <p className="text-gray-500 dark:text-gray-400">No action items identified</p>
      </div>
    );
  }

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'in progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'blocked':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'pending':
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-center space-x-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Action Items
        </h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">Task</th>
              <th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">Assigned To</th>
              <th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">Deadline</th>
              <th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">Priority</th>
              <th className="text-left py-2 font-medium text-gray-700 dark:text-gray-300">Status</th>
            </tr>
          </thead>
          <tbody>
            {actionItems.map((item, index) => (
              <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                <td className="py-3 pr-4">
                  <p className="text-gray-900 dark:text-white">{item.task}</p>
                </td>
                <td className="py-3 pr-4">
                  <div className="flex items-center space-x-1">
                    <User className="w-3 h-3 text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">{item.assignedTo}</span>
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3 text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">{item.deadline}</span>
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(item.priority)}`}>
                    {item.priority}
                  </span>
                </td>
                <td className="py-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ConversationInsights = ({ insights }) => {
  if (!insights) {
    return (
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Conversation Insights
        </h3>
        <p className="text-gray-500 dark:text-gray-400">No insights available</p>
      </div>
    );
  }

  const getSentimentColor = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive':
        return 'text-green-600 dark:text-green-400';
      case 'negative':
        return 'text-red-600 dark:text-red-400';
      case 'neutral':
        return 'text-yellow-600 dark:text-yellow-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const renderTalkRatio = () => {
    if (!insights.talkRatio) return null;
    
    const speakers = Object.keys(insights.talkRatio);
    
    return (
      <div className="space-y-2">
        <h4 className="font-medium text-gray-900 dark:text-white">Talk-to-Listen Ratio</h4>
        {speakers.map((speaker) => {
          const percentage = Math.round(insights.talkRatio[speaker] * 100);
          return (
            <div key={speaker} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">{speaker}</span>
                <span className="text-gray-600 dark:text-gray-400">{percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-primary-600 h-2 rounded-full"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="card p-6">
      <div className="flex items-center space-x-2 mb-4">
        <TrendingUp className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Conversation Insights
        </h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sentiment Analysis */}
        {insights.sentiment && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 dark:text-white">Sentiment Analysis</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Overall Sentiment</span>
                <span className={`font-medium ${getSentimentColor(insights.sentiment.overall)}`}>
                  {insights.sentiment.overall}
                </span>
              </div>
              {insights.sentiment.score && (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Confidence</span>
                    <span className="text-gray-700 dark:text-gray-300">{Math.round(insights.sentiment.score * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-primary-600 h-2 rounded-full"
                      style={{ width: `${insights.sentiment.score * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
              {insights.sentiment.analysis && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {insights.sentiment.analysis}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Talk Ratio */}
        {insights.talkRatio && (
          <div>
            {renderTalkRatio()}
          </div>
        )}

        {/* Recurring Themes */}
        {insights.recurringThemes && insights.recurringThemes.length > 0 && (
          <div className="md:col-span-2 space-y-3">
            <h4 className="font-medium text-gray-900 dark:text-white">Recurring Themes</h4>
            <div className="flex flex-wrap gap-2">
              {insights.recurringThemes.map((theme, index) => (
                <span 
                  key={index}
                  className="px-3 py-1 bg-primary-100 dark:bg-primary-900/20 text-primary-800 dark:text-primary-300 rounded-full text-sm"
                >
                  {theme}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Key Metrics */}
        {insights.keyMetrics && (
          <div className="md:col-span-2">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">Key Metrics</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(insights.keyMetrics).map(([key, value]) => (
                <div key={key} className="text-center">
                  <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                    {value}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conversation Dynamics */}
        {insights.conversationDynamics && (
          <div className="md:col-span-2 space-y-3">
            <h4 className="font-medium text-gray-900 dark:text-white">Conversation Dynamics</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {Object.entries(insights.conversationDynamics).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                  </span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export { ConversationSummary, KeyDecisions, KeyPoints, ActionItems, ConversationInsights, Classification };