import { Link, useLocation } from "react-router-dom";
import logo from "../assets/images/pgim-msf.png";
import msfLogo from "../assets/images/sm.png";


const Sidebar = () => {
  const location = useLocation();

  const navItems = [
    { name: "Automated Creation", path: "/" },
    { name: "All Surveys", path: "/all-surveys" },
  ];

  return (
    <div className="w-74 bg-gray-900 text-white min-h-screen flex flex-col shadow-xl fixed left-0 top-0">
      <div className="p-6 border-b border-gray-800">
        <img src={logo} alt="logo" className="w-full" />
        <br />
        <div className="flex gap-2">
          <img src={msfLogo} alt="logo" className="w-8" />
          <h2 className="text-2xl font-bold tracking-tight text-blue-400">
            MSF Automation
          </h2>
        </div>
      </div>
      <nav className="mt-6 flex-1">
        <ul className="space-y-2 px-4">
          {navItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  location.pathname === item.path
                    ? "bg-blue-600 text-white shadow-md"
                    : "hover:bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                {item.path === "/" ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                    ></path>
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    ></path>
                  </svg>
                )}
                <span className="font-medium">{item.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-6 border-t border-gray-800">
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
