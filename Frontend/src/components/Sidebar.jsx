import { Link, useLocation } from "react-router-dom";
import logo from "../assets/images/pgim-msf.png";
import msfLogo from "../assets/images/sm.png";


const Sidebar = ({ onLogout }) => {
  const location = useLocation();

  const surveyNavItems = [
    { name: "Automated Creation", path: "/" },
    { name: "All Surveys", path: "/all-surveys" },
    { name: "Ready for Analysis", path: "/ready-for-analysis" },
    { name: "To Be Analyzed", path: "/to-be-analyzed" },
    { name: "Analyzed & Completed", path: "/analyzed-completed" },
  ];

  const subjectNavItems = [
    { name: "Subject Upload", path: "/subject-upload" },
    { name: "Subject Settings", path: "/subject-settings" },
  ];

  const getIcon = (path) => {
    switch (path) {
      case "/":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        );
      case "/all-surveys":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        );
      case "/ready-for-analysis":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case "/to-be-analyzed":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        );
      case "/analyzed-completed":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "/subject-upload":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        );
      case "/subject-settings":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const renderNavLink = (item) => (
    <li key={item.path}>
      <Link
        to={item.path}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
          location.pathname === item.path
            ? "bg-blue-600 text-white shadow-md"
            : "hover:bg-gray-800 text-gray-400 hover:text-white"
        }`}
      >
        {getIcon(item.path)}
        <span className="font-medium">{item.name}</span>
      </Link>
    </li>
  );

  return (
    <div className="w-74 bg-gray-900 text-white min-h-screen flex flex-col shadow-xl fixed left-0 top-0">
      <div className="p-6 border-b border-gray-800">
        <Link to="/" className="flex gap-2 hover:opacity-80 transition-opacity">
          <img src={logo} alt="logo" className="w-full" />
        </Link>
        <br />
        <Link to="/" className="flex gap-2 hover:opacity-80 transition-opacity">
          <img src={msfLogo} alt="logo" className="w-8" />
          <h2 className="text-2xl font-bold tracking-tight text-blue-400">
            MSF Automation
          </h2>
        </Link>
      </div>
      <nav className="mt-6 flex-1 overflow-y-auto">
        {/* MSF Survey Section */}
        <div className="px-4 mb-2">
          <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-gray-600">
            Surveys
          </p>
        </div>
        <ul className="space-y-1 px-4">
          {surveyNavItems.map(renderNavLink)}
        </ul>

        {/* Divider */}
        <div className="my-4 mx-6 border-t border-gray-800"></div>

        {/* Subject Section */}
        <div className="px-4 mb-2">
          <p className="px-4 text-[10px] font-bold uppercase tracking-widest text-gray-600">
            Documents
          </p>
        </div>
        <ul className="space-y-1 px-4">
          {subjectNavItems.map(renderNavLink)}
        </ul>
      </nav>
      <div className="p-6 border-t border-gray-800">
        {onLogout && (
          <button 
            onClick={onLogout}
            className="w-full mb-6 px-4 py-2 border border-blue-500 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        )}
        <p className="text-xs font-bold tracking-tight text-white">
          Developed by{" "}
          <a target="_blank" href="https://dushanportfolio.textaworld.com/">
            Dushan
          </a>{" "}
        </p>
        <p className="text-xs font-bold tracking-tight text-white">
          Version 1.0.0
        </p>
      </div>
    </div>
  );
};

export default Sidebar;
