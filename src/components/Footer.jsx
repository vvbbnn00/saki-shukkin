function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-gray-300 text-gray-700 py-4 mt-5 max-w-[1024px] w-full mx-auto">
      <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
        {/* 左侧信息 */}
        <div className="text-sm">
          <p>
            © {year}
            <span className="ml-2">
              <del>豊川グループ</del>
            </span>{" "}
            vvbbnn00 All rights reserved.
          </p>
        </div>
        {/* 右侧友链 */}
        <div className="text-sm mt-2 md:mt-0">
          <p>
            <a
              href="https://github.com/vvbbnn00"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline"
            >
              GitHub @vvbbnn00
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
