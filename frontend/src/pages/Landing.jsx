import Navbar from '../components/Layout/Navbar';
import Hero from '../components/Home/Hero';
import Stats from '../components/Home/Stats';

const Landing = () => {
  return (
    <div className="min-h-screen bg-matte">
      <Navbar />
      <Hero />
      <Stats />
    </div>
  );
};

export default Landing;