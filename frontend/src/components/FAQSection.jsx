import React, { useState, useEffect } from 'react'
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'

export default function FAQSection() {
  const [faqs, setFaqs] = useState([])
  const [openIndex, setOpenIndex] = useState(null)

  useEffect(() => {
    fetch('/api/patient/faqs')
      .then((res) => res.json())
      .then((data) => setFaqs(data))
      .catch((err) => console.error("Error loading FAQs:", err))
  }, [])

  const toggleFAQ = (idx) => {
    setOpenIndex(openIndex === idx ? null : idx)
  }

  return (
    <div className="faq-accordion">
      <div className="section-title">
        <HelpCircle className="text-emerald-600" size={22} /> Frequently Asked Questions
      </div>

      {faqs.map((faq, idx) => (
        <div key={idx} className="faq-item">
          <div className="faq-question" onClick={() => toggleFAQ(idx)}>
            <span>{faq.question}</span>
            {openIndex === idx ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
          {openIndex === idx && (
            <div className="faq-answer">
              {faq.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
