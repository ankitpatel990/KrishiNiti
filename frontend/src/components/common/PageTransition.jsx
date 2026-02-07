/**
 * PageTransition - Motion wrapper for smooth route transitions.
 *
 * Wraps page content with a fade + slide-up entrance animation.
 * Designed to be used inside AnimatePresence at the route level.
 */

import { motion } from "framer-motion";
import PropTypes from "prop-types";

const PAGE_VARIANTS = {
  initial: {
    opacity: 0,
    y: 8,
  },
  enter: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -8,
  },
};

const TRANSITION = {
  duration: 0.25,
  ease: "easeOut",
};

function PageTransition({ children, className = "" }) {
  return (
    <motion.div
      variants={PAGE_VARIANTS}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={TRANSITION}
      className={className}
    >
      {children}
    </motion.div>
  );
}

PageTransition.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

export default PageTransition;
