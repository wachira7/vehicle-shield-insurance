"use client"
import { useState } from "react"
import { Shield, Car, FileText, Lock, ChevronDown, ChevronUp, Star, CheckCircle, XCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { useRouter } from 'next/navigation'

const Page = () => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null)
  const router = useRouter()

  const handleGetStarted = () => {
    router.push('/auth')
  }
  const features = [
    {
      icon: Car,
      title: "Easy Vehicle Registration",
      description: "Register your vehicle in minutes with our streamlined process",
    },
    {
      icon: Shield,
      title: "Smart Insurance Policies",
      description: "Get customized coverage based on your vehicle's characteristics",
    },
    {
      icon: FileText,
      title: "Hassle-free Claims",
      description: "Submit and track claims with our transparent blockchain system",
    },
    {
      icon: Lock,
      title: "Secure & Transparent",
      description: "Built on blockchain technology for maximum security and transparency",
    },
  ]

  const steps = [
    { title: "Connect your wallet", description: "Securely link your Web3 wallet to our platform" },
    { title: "Register your vehicle", description: "Input your vehicle details for a tailored policy" },
    { title: "Choose your coverage", description: "Select from our range of smart contract policies" },
    { title: "Get instant protection", description: "Your policy is active immediately on the blockchain" },
  ]

  const testimonials = [
    {
      name: "Alex Thompson",
      role: "Vehicle Owner",
      content: "VehicleShield made getting insurance so simple. The blockchain technology gives me peace of mind.",
      rating: 5,
      avatar: "/placeholder.svg?height=60&width=60",
    },
    {
      name: "Sarah Chen",
      role: "Car Enthusiast",
      content: "The transparent pricing and quick claims processing are game-changers. Highly recommended!",
      rating: 5,
      avatar: "/placeholder.svg?height=60&width=60",
    },
    {
      name: "Michael Roberts",
      role: "Fleet Manager",
      content: "Managing multiple vehicle policies has never been easier. The dashboard is intuitive and efficient.",
      rating: 4,
      avatar: "/placeholder.svg?height=60&width=60",
    },
  ]

  const faqs = [
    {
      question: "How does blockchain insurance work?",
      answer:
        "Our blockchain insurance uses smart contracts to automate policy issuance, claims processing, and payments. This ensures transparency, reduces fraud, and speeds up all insurance-related processes.",
    },
    {
      question: "What documents do I need to register?",
      answer:
        "You'll need your vehicle registration number, photos of your vehicle, and proof of ownership. All documents are securely stored and verified on the blockchain.",
    },
    {
      question: "How quick is the claims process?",
      answer:
        "Claims can be submitted instantly through our platform. With smart contracts, valid claims are processed and paid out automatically, typically within 24-48 hours.",
    },
    {
      question: "Is my data secure?",
      answer:
        "Yes, all your data is encrypted and stored on the blockchain. We use advanced security protocols to ensure your information remains private and secure.",
    },
  ]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 relative overflow-hidden"
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-blue-600 transform -skew-y-6"></div>
        </div>
        <div className="text-center relative z-10">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Decentralized Vehicle Insurance
            <span className="text-blue-600"> Made Simple</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Protect your vehicle with blockchain-powered insurance that is transparent, efficient, and hassle-free.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleGetStarted()}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold 
                     hover:bg-blue-700 transition-colors duration-200"
          >
            Get Started
          </motion.button>
        </div>
      </motion.div>

      {/* Features Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg 
                        transition-shadow duration-200"
            >
              <feature.icon className="h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* How It Works */}
      <div className="bg-blue-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                className="flex flex-col items-center text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div
                  className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center 
                              text-blue-600 font-bold text-2xl mb-4"
                >
                  {index + 1}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Why Choose Blockchain Insurance</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-blue-600 text-white">
                  <th className="p-4 text-left">Feature</th>
                  <th className="p-4 text-center">Traditional Insurance</th>
                  <th className="p-4 text-center">VehicleShield</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-4 font-medium">Claim Processing Time</td>
                  <td className="p-4 text-center">Days to Weeks</td>
                  <td className="p-4 text-center font-semibold text-green-600">24-48 Hours</td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-medium">Policy Transparency</td>
                  <td className="p-4 text-center">
                    <XCircle className="inline h-5 w-5 text-red-500" />
                  </td>
                  <td className="p-4 text-center">
                    <CheckCircle className="inline h-5 w-5 text-green-500" />
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-medium">Automated Payouts</td>
                  <td className="p-4 text-center">
                    <XCircle className="inline h-5 w-5 text-red-500" />
                  </td>
                  <td className="p-4 text-center">
                    <CheckCircle className="inline h-5 w-5 text-green-500" />
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-medium">24/7 Policy Management</td>
                  <td className="p-4 text-center">
                    <XCircle className="inline h-5 w-5 text-red-500" />
                  </td>
                  <td className="p-4 text-center">
                    <CheckCircle className="inline h-5 w-5 text-green-500" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="bg-blue-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">What Our Users Say</h2>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {testimonials.map((testimonial, index) => (
              <motion.div key={index} variants={itemVariants} className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex items-center mb-4">
                  <Image
                    src={testimonial.avatar || "/placeholder.svg"}
                    alt={testimonial.name}
                    width={60}
                    height={60}
                    className="rounded-full mr-4"
                  />
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-gray-600 text-sm">{testimonial.role}</div>
                  </div>
                </div>
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-700">&quot;{testimonial.content}&quot;</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Frequently Asked Questions</h2>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="max-w-3xl mx-auto"
        >
          {faqs.map((faq, index) => (
            <motion.div variants={itemVariants} key={index} className="mb-4">
              <button
                onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                className="w-full flex justify-between items-center p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <span className="font-semibold text-left text-gray-900">{faq.question}</span>
                {activeFaq === index ? (
                  <ChevronUp className="h-5 w-5 text-blue-600" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-blue-600" />
                )}
              </button>
            <AnimatePresence> 
              {activeFaq === index && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: "auto" }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 bg-blue-50 rounded-b-lg">
                    <p className="text-gray-700">{faq.answer}</p>
                  </div>
                </motion.div>
              )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* CTA Section */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="bg-blue-600 py-16"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Protected?</h2>
          <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
            Join the future of vehicle insurance today. Get started with VehicleShield.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleGetStarted()}
            className="bg-white text-blue-600 px-8 py-3 rounded-lg text-lg font-semibold 
                     hover:bg-blue-50 transition-colors duration-200"
          >
            Get Started
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}

export default Page

