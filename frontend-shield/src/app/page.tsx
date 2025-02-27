"use client"
import { useState, useEffect } from "react"
import { Shield, Car, FileText, Lock, ChevronDown, ChevronUp, Star, CheckCircle, XCircle, Sun, Moon, Info, ArrowRight } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/app/components/ui/tooltip"
import { Button } from "@/app/components/ui/button"
import { Badge } from "@/app/components/ui/badge"
import { Card, CardContent } from "@/app/components/ui/card"

const Page = () => {
  const [activeFaq, setActiveFaq] = useState<number | null>(null)
  const [darkMode, setDarkMode] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [darkMode])

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
  }

  const handleGetStarted = () => {
    router.push("/auth")
  }
  const features = [
    {
      icon: Car,
      title: "Easy Vehicle Registration",
      description: "Register your vehicle in minutes with our streamlined process",
      tooltip: "Upload your vehicle details and photos to create your profile"
    },
    {
      icon: Shield,
      title: "Smart Insurance Policies",
      description: "Get customized coverage based on your vehicle's characteristics",
      tooltip: "AI-powered risk assessment for personalized policy recommendations"
    },
    {
      icon: FileText,
      title: "Hassle-free Claims",
      description: "Submit and track claims with our transparent blockchain system",
      tooltip: "Track your claim status in real-time through every step of the process"
    },
    {
      icon: Lock,
      title: "Secure & Transparent",
      description: "Built on blockchain technology for maximum security and transparency",
      tooltip: "All policies and claims are recorded on the Ethereum blockchain for immutability"
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
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col dark:from-gray-900 dark:to-gray-800 dark:text-gray-100 transition-colors duration-300">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-12 xl:px-24 pt-24 pb-16 relative overflow-hidden"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleDarkMode}
            className="absolute top-4 right-4 p-2 rounded-full bg-gray-200 dark:bg-gray-700 z-10"
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
          </motion.button>
          
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-blue-600 transform -skew-y-6"></div>
          </div>
          
          <div className="text-center relative z-10 max-w-4xl mx-auto">
            <div className="mb-4 flex justify-center">
              <Badge variant="outline" className="px-3 py-1 text-blue-600 border-blue-200 dark:text-blue-400 dark:border-blue-800">
                Web3 Insurance Platform
              </Badge>
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-6">
              Decentralized Vehicle Insurance
              <span className="text-blue-600 dark:text-blue-400"> Made Simple</span>
            </h1>
            
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              Protect your vehicle with blockchain-powered insurance that is transparent, efficient, and hassle-free.
            </p>
            
            <Button
              size="lg"
              onClick={() => handleGetStarted()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 rounded-lg text-lg font-semibold transition-all"
            >
              Get Started <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          id="features"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-12 xl:px-24 py-16"
        >
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">Features</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold">Why Choose VehicleShield</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md hover:shadow-lg 
                          transition-all duration-200 border border-gray-100 dark:border-gray-700"
              >
                <div className="flex justify-between items-start">
                  <feature.icon className="h-12 w-12 text-blue-600 dark:text-blue-400 mb-4" />
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                        <Info className="h-4 w-4" />
                        <span className="sr-only">More info</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>{feature.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-300">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* How It Works */}
        <div id="how-it-works" className="bg-blue-50 dark:bg-gray-900 py-16">
          <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-12 xl:px-24">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4">Process</Badge>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center text-gray-900 dark:text-white mb-12">How It Works</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-7xl mx-auto">
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  className="flex flex-col items-center text-center"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <div
                    className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center 
                                text-blue-600 dark:text-blue-400 font-bold text-2xl mb-4 relative"
                  >
                    {index + 1}
                    {index < steps.length - 1 && (
                      <div className="absolute left-full top-1/2 w-full border-t-2 border-dashed border-blue-200 dark:border-blue-800 -translate-y-1/2 hidden md:block" style={{ width: 'calc(100% - 4rem)' }}></div>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{step.title}</h3>
                  <p className="text-gray-600 dark:text-gray-300">{step.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="py-16">
          <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-12 xl:px-24">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4">Comparison</Badge>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center text-gray-900 dark:text-white mb-6">
                Why Choose Blockchain Insurance
              </h2>
              <p className="text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                See how VehicleShield compares to traditional insurance providers on key metrics
              </p>
            </div>
            
            <Card className="max-w-7xl mx-auto shadow-lg">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-blue-600 dark:bg-blue-800 text-white">
                        <th className="p-4 text-left">Feature</th>
                        <th className="p-4 text-center">Traditional Insurance</th>
                        <th className="p-4 text-center">VehicleShield</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b dark:border-gray-700">
                        <td className="p-4 font-medium">Claim Processing Time</td>
                        <td className="p-4 text-center">Days to Weeks</td>
                        <td className="p-4 text-center font-semibold text-green-600 dark:text-green-400">24-48 Hours</td>
                      </tr>
                      <tr className="border-b dark:border-gray-700">
                        <td className="p-4 font-medium">Policy Transparency</td>
                        <td className="p-4 text-center">
                          <XCircle className="inline h-5 w-5 text-red-500 dark:text-red-400" />
                        </td>
                        <td className="p-4 text-center">
                          <CheckCircle className="inline h-5 w-5 text-green-500 dark:text-green-400" />
                        </td>
                      </tr>
                      <tr className="border-b dark:border-gray-700">
                        <td className="p-4 font-medium">Automated Payouts</td>
                        <td className="p-4 text-center">
                          <XCircle className="inline h-5 w-5 text-red-500 dark:text-red-400" />
                        </td>
                        <td className="p-4 text-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="inline-flex">
                                <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Smart contracts automatically process verified claims without human intervention</p>
                            </TooltipContent>
                          </Tooltip>
                        </td>
                      </tr>
                      <tr className="border-b dark:border-gray-700">
                        <td className="p-4 font-medium">24/7 Policy Management</td>
                        <td className="p-4 text-center">
                          <XCircle className="inline h-5 w-5 text-red-500 dark:text-red-400" />
                        </td>
                        <td className="p-4 text-center">
                          <CheckCircle className="inline h-5 w-5 text-green-500 dark:text-green-400" />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Testimonials */}
        <div className="bg-blue-50 dark:bg-gray-900 py-16">
          <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-12 xl:px-24">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4">Testimonials</Badge>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center text-gray-900 dark:text-white mb-6">
                What Our Users Say
              </h2>
            </div>
            
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto"
            >
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex items-center mb-4">
                    <Image
                      src={testimonial.avatar || "/placeholder.svg"}
                      alt={testimonial.name}
                      width={60}
                      height={60}
                      className="rounded-full mr-4"
                      loading="lazy"
                    />
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{testimonial.name}</div>
                      <div className="text-gray-600 dark:text-gray-300 text-sm">{testimonial.role}</div>
                    </div>
                  </div>
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 dark:text-yellow-300 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-700 dark:text-gray-300">&quot;{testimonial.content}&quot;</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* FAQ Section */}
        <div id="faq" className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-12 xl:px-24 py-16">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">FAQ</Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-center text-gray-900 dark:text-white mb-6">
              Frequently Asked Questions
            </h2>
            <p className="text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Get answers to the most common questions about our blockchain insurance platform
            </p>
          </div>
          
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            {faqs.map((faq, index) => (
              <motion.div variants={itemVariants} key={index} className="mb-4">
                <Button
                  variant="outline"
                  onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                  className="w-full flex justify-between items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 h-auto"
                  aria-expanded={activeFaq === index}
                  aria-controls={`faq-answer-${index}`}
                >
                  <span className="font-semibold text-left text-gray-900 dark:text-gray-100">{faq.question}</span>
                  {activeFaq === index ? (
                    <ChevronUp className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 ml-2" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 ml-2" />
                  )}
                </Button>
                <AnimatePresence>
                  {activeFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <Card className="border-t-0 rounded-t-none">
                        <CardContent className="pt-4">
                          <p className="text-gray-700 dark:text-gray-300">{faq.answer}</p>
                        </CardContent>
                      </Card>
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
          className="bg-blue-600 dark:bg-blue-800 py-16"
        >
          <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-12 xl:px-24 text-center">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">Ready to Get Protected?</h2>
            <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
              Join the future of vehicle insurance today. Get started with VehicleShield.
            </p>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => handleGetStarted()}
              className="bg-white text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-100 px-8 py-6 rounded-lg text-lg font-semibold transition-all"
            >
              Get Started <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </motion.div>
      </div>
    </TooltipProvider>
  )
}

export default Page