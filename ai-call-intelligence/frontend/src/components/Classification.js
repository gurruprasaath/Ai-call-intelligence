import React from 'react';
import { Tag, Users, Clock, TrendingUp } from 'lucide-react';

const Classification = ({ classification }) => {
  if (!classification) {
    return null;
  }

  const {
    category,
    confidence,
    confidenceLevel,
    allScores = {},
    context = {},
    multiCategory = {}
  } = classification;

  // Category color mapping
  const getCategoryColor = (cat) => {
    const colorMap = {
      'Work': 'bg-blue-100 text-blue-800 border-blue-200',
      'Family': 'bg-green-100 text-green-800 border-green-200',
      'Personal': 'bg-purple-100 text-purple-800 border-purple-200',
      'Education': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Healthcare': 'bg-red-100 text-red-800 border-red-200',
      'Financial': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'Technical': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'Legal': 'bg-gray-100 text-gray-800 border-gray-200',
      'General': 'bg-slate-100 text-slate-800 border-slate-200'
    };
    return colorMap[cat] || colorMap['General'];
  };

  // Confidence level color
  const getConfidenceColor = (level) => {
    const colorMap = {
      'High': 'text-green-600',
      'Medium': 'text-yellow-600',
      'Low': 'text-red-600'
    };
    return colorMap[level] || colorMap['Medium'];
  };

  // Get category icon
  const getCategoryIcon = (cat) => {
    const iconMap = {
      'Work': '💼',
      'Family': '👨‍👩‍👧‍👦',
      'Personal': '🧑',
      'Education': '🎓',
      'Healthcare': '🏥',
      'Financial': '💰',
      'Technical': '💻',
      'Legal': '⚖️',
      'General': '💬'
    };
    return iconMap[cat] || iconMap['General'];
  };

  // Format confidence percentage
  const confidencePercent = Math.round((confidence || 0) * 100);

  // Get top 3 category scores for display
  const topScores = Object.entries(allScores)
    .sort(([,a], [,b]) => b.score - a.score)
    .slice(0, 3);

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex items-center gap-2 mb-4">
        <Tag className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Call Classification</h3>
      </div>

      {/* Primary Classification */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getCategoryIcon(category)}</span>
            <div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getCategoryColor(category)}`}>
                {category}
              </span>
              <div className="mt-1">
                <span className={`text-sm font-medium ${getConfidenceColor(confidenceLevel)}`}>
                  {confidencePercent}% Confidence ({confidenceLevel})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Confidence Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              confidenceLevel === 'High' ? 'bg-green-500' :
              confidenceLevel === 'Medium' ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${confidencePercent}%` }}
          ></div>
        </div>
      </div>

      {/* Multi-Category Detection */}
      {multiCategory.isMultiCategory && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">Multi-Category Conversation</span>
          </div>
          <p className="text-sm text-amber-700">
            This conversation spans multiple categories: {multiCategory.categories?.join(' & ')}
          </p>
        </div>
      )}

      {/* Category Scores */}
      {topScores.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Category Breakdown</h4>
          <div className="space-y-2">
            {topScores.map(([cat, data]) => (
              <div key={cat} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getCategoryIcon(cat)}</span>
                  <span className="text-sm text-gray-700">{cat}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-blue-500 h-1.5 rounded-full"
                      style={{ width: `${Math.min((data.score || 0) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">
                    {Math.round((data.score || 0) * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Context Information */}
      {context && Object.keys(context).length > 0 && (
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Context Analysis</h4>
          <div className="grid grid-cols-2 gap-4">
            {context.formality && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                <div>
                  <span className="text-xs text-gray-500">Formality</span>
                  <p className="text-sm text-gray-700">{context.formality}</p>
                </div>
              </div>
            )}
            
            {context.urgency && (
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <div>
                  <span className="text-xs text-gray-500">Urgency</span>
                  <p className="text-sm text-gray-700">{context.urgency}</p>
                </div>
              </div>
            )}
            
            {context.sentiment && (
              <div className="col-span-2">
                <span className="text-xs text-gray-500">Sentiment Markers</span>
                <p className="text-sm text-gray-700">{context.sentiment}</p>
              </div>
            )}
            
            {context.participants && context.participants.length > 0 && (
              <div className="col-span-2">
                <span className="text-xs text-gray-500">Participant Types</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {context.participants.map((participant, index) => (
                    <span 
                      key={index}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
                    >
                      {participant}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Classification;