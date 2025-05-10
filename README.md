# InstantAI

InstantAI is a powerful data analysis and clustering platform that helps users understand their data through advanced AI-driven insights, interactive visualizations, and intelligent clustering algorithms.

## 🌟 Features

### 1. Data Analysis & Clustering
- **Interactive Clustering**: View and analyze data clusters with an intuitive interface
- **Multi-level Drill-down**: Navigate through cluster hierarchies with breadcrumb navigation
- **Dynamic KPI Selection**: Switch between different KPIs for varied analysis perspectives
- **Cluster Tree Visualization**: Visual representation of cluster hierarchies
- **CSV Export**: Download cluster data for further analysis

### 2. Chatbot Integration
- **AI-Powered Assistant**: Get instant answers about your data
- **Context-Aware Responses**: Chatbot understands your current analysis context
- **Markdown Support**: Rich text formatting in responses
- **Code Snippet Display**: View and copy code examples

### 3. Configuration & Settings
- **File Upload**: Support for various data formats
- **Column Selection**: Choose important columns for analysis
- **Customizable Settings**: Fine-tune clustering parameters
- **Validation System**: Ensure data quality before processing

### 4. Workbench
- **Advanced Analysis Tools**: Deep dive into specific clusters
- **Custom Queries**: Run specialized analysis on selected data
- **Interactive Visualizations**: Dynamic charts and graphs

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Modern web browser

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/instant-ai.git
cd instant-ai-frontend-2
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:
Create a `.env` file in the root directory with the following variables:
```env
VITE_BASE_URL=your_backend_api_url
```

### Development

Start the development server:
```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
# or
yarn build
```

## 🔧 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| VITE_BASE_URL | Backend API URL | Yes |

## 🏗️ Project Structure

```
instant-ai-frontend-2/
├── src/
│   ├── Components/     # Reusable UI components
│   ├── Pages/         # Main application pages
│   ├── redux/         # State management
│   ├── utils/         # Utility functions
│   └── App.jsx        # Main application component
├── public/            # Static assets
└── index.html         # Entry HTML file
```

## 🔄 API Integration

The frontend communicates with the backend through the following main endpoints:

- `/process`: Data processing and clustering
- `/chat`: Chatbot interactions
- `/projects`: Project management
- `/clusters`: Cluster data retrieval

## 🎨 UI/UX Features

- **Responsive Design**: Works on all screen sizes
- **Dark/Light Mode**: User preference support
- **Loading States**: Clear feedback during operations
- **Error Handling**: User-friendly error messages
- **Tooltips**: Helpful information on hover
- **Keyboard Navigation**: Enhanced accessibility

## 🔒 Security

- Secure data transmission
- Input validation
- XSS protection
- CORS configuration

## 🚀 Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy

### Environment Variables in Vercel

1. Go to your project in Vercel dashboard
2. Navigate to Settings > Environment Variables
3. Add the following variable:
   - `VITE_BASE_URL`

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Authors

- Your Name - Initial work

## 🙏 Acknowledgments

- Thanks to all contributors
- Special thanks to the open-source community
- Inspired by modern data analysis tools

## 📞 Support

For support, email support@instantai.com or open an issue in the repository.
