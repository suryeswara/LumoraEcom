import useDocumentTitle from "../hooks/useDocumentTitle";
import Hero from "./home/Hero";
import { Benefits, Faq, FinalCta, HowItWorks, ProblemSolution, Tagline } from "./home/Sections";

// The public landing page. Products live on the Shop page, which needs a login.
const Home = () => {
  useDocumentTitle();

  return (
    <>
      <Hero />
      <ProblemSolution />
      <Benefits />
      <Tagline />
      <HowItWorks />
      <Faq />
      <FinalCta />
    </>
  );
};

export default Home;
