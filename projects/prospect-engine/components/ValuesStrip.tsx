import { TradeColors } from '@/lib/tradeConfig'

interface ValuesStripProps {
  colors: TradeColors
}

const VALUES = [
  { icon: '✅', title: 'Satisfaction Guaranteed', body: "Not happy? We'll make it right — no questions asked." },
  { icon: '🔧', title: 'Expert Technicians', body: 'Licensed, background-checked, and skilled in every trade we offer.' },
  { icon: '⏱️', title: 'On Time, Every Time', body: 'We show up when we say we will. No chasing, no excuses.' },
  { icon: '💲', title: 'Upfront Pricing', body: "You'll know the cost before we start. No hidden fees, ever." },
]

export default function ValuesStrip({ colors }: ValuesStripProps) {
  return (
    <section className="py-12 px-4 bg-white border-b border-gray-100">
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
        {VALUES.map((v) => (
          <div key={v.title} className="flex flex-col items-center text-center gap-2">
            <span className="text-3xl">{v.icon}</span>
            <h4 className="font-bold text-sm" style={{ color: colors.primary }}>
              {v.title}
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed">{v.body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
