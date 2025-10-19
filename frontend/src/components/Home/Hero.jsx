import { motion } from 'framer-motion';

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 bg-matte overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-gold/5 to-matte/5" />
      
      {/* Content */}
      <div className="max-w-7xl mx-auto text-center z-10">
        <motion.h1 
          className="text-4xl md:text-6xl lg:text-7xl font-clash font-bold mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          Where Vision Meets Impact
        </motion.h1>

        <motion.p 
          className="text-lg md:text-xl text-graytext max-w-2xl mx-auto mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Empowering creators, leaders, and innovators with technology and purpose.
        </motion.p>

        <motion.div 
          className="flex flex-col md:flex-row items-center justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <button className="btn-primary w-full md:w-auto">
            Get Started
          </button>
          <button className="btn-secondary w-full md:w-auto">
            Learn More
          </button>
        </motion.div>
      </div>

      {/* Animated Particles */}
      <div className="absolute inset-0 z-0">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-gold/20 rounded-full"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              scale: 0
            }}
            animate={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              scale: [0, 1, 0],
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              repeatType: "loop",
              ease: "easeInOut",
              delay: Math.random() * 2
            }}
          />
        ))}
      </div>
    </section>
  );
};

export default Hero;