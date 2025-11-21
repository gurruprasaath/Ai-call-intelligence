# AI Call Intelligence - Frontend

Modern React.js frontend for the AI Call Intelligence Tool with TailwindCSS styling and responsive design.

## Features

- 🎨 Modern UI with TailwindCSS
- 🌓 Dark/Light mode toggle
- 📱 Fully responsive design
- 🔄 Real-time file upload with progress
- 📊 Interactive data visualization
- 🚀 Fast and optimized performance
- ♿ Accessible components

## Project Structure

```
frontend/
├── public/
│   ├── index.html         # Main HTML template
│   └── manifest.json      # PWA manifest
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── FileUpload.js     # Drag & drop file upload
│   │   ├── Layout.js         # Main layout with sidebar
│   │   └── ResultsDisplay.js # Analysis results components
│   ├── hooks/            # Custom React hooks
│   │   └── useTheme.js       # Dark/light theme management
│   ├── pages/            # Route components
│   │   ├── Dashboard.js      # Main dashboard
│   │   ├── Upload.js         # File upload page
│   │   ├── CallDetails.js    # Individual call analysis
│   │   ├── PastCalls.js      # Call history
│   │   └── Settings.js       # App settings
│   ├── services/         # API and external services
│   │   └── api.js           # Backend API integration
│   ├── App.js            # Main app component
│   ├── index.js          # App entry point
│   └── index.css         # Global styles
├── package.json          # Dependencies
├── tailwind.config.js    # TailwindCSS configuration
└── postcss.config.js     # PostCSS configuration
```

## Installation & Setup

1. **Navigate to Frontend Directory**
   ```cmd
   cd frontend
   ```

2. **Install Dependencies**
   ```cmd
   npm install
   ```

3. **Start Development Server**
   ```cmd
   npm start
   ```

4. **Build for Production**
   ```cmd
   npm run build
   ```

The app will be available at `http://localhost:3000` and will proxy API requests to the backend at `http://localhost:3001`.

## Key Components

### 1. FileUpload Component
- Drag & drop file upload
- File validation (MP3/WAV, 50MB limit)
- Upload progress tracking
- Error handling

### 2. Layout Component
- Responsive sidebar navigation
- Dark/light mode toggle
- Mobile-friendly hamburger menu
- User profile section

### 3. ResultsDisplay Components
- **ConversationSummary**: Bullet-point summary
- **KeyDecisions**: Decision tracking with confidence levels
- **ActionItems**: Task management table
- **ConversationInsights**: Analytics and metrics

### 4. Theme Management
- Persistent theme preferences
- System theme detection
- Smooth transitions
- CSS custom properties

## API Integration

The frontend communicates with the backend through the `apiService`:

```javascript
// Upload audio file
const result = await apiService.uploadAudio(file, onProgress);

// Get all calls
const calls = await apiService.getAllCalls();

// Get call details
const call = await apiService.getCallDetails(callId);

// Delete call
await apiService.deleteCall(callId);
```

### Error Handling

Comprehensive error handling for:
- Network connectivity issues
- File upload failures
- API response errors
- Validation errors

## Responsive Design

The application is fully responsive with:
- Mobile-first design approach
- Breakpoints: `sm`, `md`, `lg`, `xl`
- Touch-friendly interactions
- Optimized layouts for all screen sizes

## Accessibility

- Semantic HTML structure
- ARIA labels and roles
- Keyboard navigation support
- Color contrast compliance
- Screen reader compatibility

## Theming

### Dark Mode
- Automatic system theme detection
- Manual toggle control
- Persistent user preference
- Smooth color transitions

### Color Palette
- **Primary**: Blue (`#3B82F6`)
- **Secondary**: Gray scales
- **Success**: Green (`#10B981`)
- **Warning**: Yellow (`#F59E0B`)
- **Error**: Red (`#EF4444`)

## Performance Optimizations

1. **Code Splitting**: Automatic route-based splitting
2. **Lazy Loading**: Components loaded on demand
3. **Bundle Optimization**: Tree shaking and minification
4. **Caching**: Aggressive caching for static assets

## Development Guidelines

### Component Structure
```javascript
const Component = ({ prop1, prop2 }) => {
  // Hooks
  const [state, setState] = useState();
  
  // Effects
  useEffect(() => {
    // Side effects
  }, []);
  
  // Handlers
  const handleAction = () => {
    // Event handling
  };
  
  // Render
  return (
    <div className="component-class">
      {/* JSX content */}
    </div>
  );
};
```

### Styling Conventions
- Use TailwindCSS utility classes
- Custom CSS only for complex animations
- Consistent spacing using Tailwind scale
- Dark mode variants for all components

### State Management
- Local state with `useState` for component state
- Context API for global state (theme)
- Custom hooks for reusable logic

## Browser Support

- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest 2 versions)
- **Mobile**: iOS Safari, Chrome Mobile
- **Features**: ES6+, CSS Grid, Flexbox, Custom Properties

## Deployment

### Development
```cmd
npm start
```

### Production Build
```cmd
npm run build
npm install -g serve
serve -s build
```

### Environment Variables
Create `.env` file for environment-specific configuration:
```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_VERSION=1.0.0
```

## Testing

```cmd
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch
```

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure backend is running on port 3001
   - Check proxy configuration in package.json

2. **Build Errors**
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Check for TypeScript errors if using TS

3. **Styling Issues**
   - Verify TailwindCSS is properly configured
   - Check for conflicting CSS

### Debug Mode
Enable debug logging by setting:
```javascript
localStorage.setItem('debug', 'true');
```

## Contributing

1. Follow the existing code style
2. Add proper TypeScript types (if migrating)
3. Include unit tests for new components
4. Update documentation for new features
5. Test on multiple devices and browsers