import { motion } from 'framer-motion';
import { UsersIcon, FolderIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

const stats = [
  {
    label: 'Users',
    value: '1,200+',
    icon: UsersIcon,
  },
  {
    label: 'Projects',
    value: '15,000+',
    icon: FolderIcon,
  },
  {
    label: 'Raised',
    value: '$2.5M+',
    icon: CurrencyDollarIcon,
  },
];

const Stats = () => {
  return (
    <section className="py-20 px-6 bg-matte">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              className="scale-up flex flex-col items-center p-8 rounded-xl bg-matte border border-gold/10 hover:border-gold/30 transition-colors"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
            >
              <stat.icon className="w-12 h-12 text-gold mb-4" />
              <h3 className="text-3xl font-clash font-bold mb-2">{stat.value}</h3>
              <p className="text-graytext">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Stats;