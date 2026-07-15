export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <p className="text-4xl mb-4">🏗️</p>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Prospect Preview Engine</h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          This is a preview environment for prospective clients. If you received a direct link,
          use it to view your personalized site preview.
        </p>
        <a
          href="https://zjhanoosh21-cell.github.io/zach-portfolio/"
          className="inline-block mt-6 text-sm font-semibold text-white px-5 py-2.5 rounded-full"
          style={{ backgroundColor: '#e8684a' }}
        >
          Visit Our Website →
        </a>
      </div>
    </main>
  )
}
