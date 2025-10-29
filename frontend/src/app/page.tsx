import Image from 'next/image';
import Link from 'next/link';
import styles from './page.module.css';

export default function LandingPage() {
  return (
    <main className={styles.landing}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logoContainer}>
          <Image src="/logo.png" alt="LockedIn Logo" width={48} height={48} className={styles.logoImage} />
          <h1 className={styles.logo}>LockedIn</h1>
        </div>
        <div className={styles.headerButtons}>
          <Link href="/login">
            <button className={styles.loginButton}>Log In</button>
          </Link>
          <Link href="/signup">
            <button className={styles.signupButton}>Sign Up</button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <Image src="/logo.png" alt="LockedIn Logo" width={96} height={96} className={styles.heroLogo} />
          <h2 className={styles.title}>Your Ultimate Study Buddy</h2>
          <p className={styles.subtitle}>
            LockedIn helps you <strong>find study partners</strong>, 
            <strong> form groups</strong>, and 
            <strong> track your progress</strong> — 
            so you stay motivated and succeed together.
          </p>
          <Link href="/signup">
            <button className={styles.ctaButton}>Get Started - Lock TF In!</button>
          </Link>
        </div>
      </section>

      {/* Our Story Section */}
      <section className={styles.storySection}>
        <div className={styles.storyGrid}>
          <div className={styles.storyText}>
            <h3 className={styles.sectionTitle}>Why We Created LockedIn</h3>
            <div className={styles.storyContent}>
              <p>
                University is already stressful enough. When projects and tests come up, finding the right people 
                to work with can add even more pressure to an already overwhelming situation.
              </p>
              <p>
                We experienced this firsthand. Our group started with just 3 people, and we desperately needed 
                to find 2-3 more members to complete our team. We were stressed, overwhelmed, and didn&apos;t know 
                where to turn.
              </p>
              <p>
                After weeks of asking around and going through friends of friends, we finally met other students 
                who were complete strangers at first. But through collaboration, we discovered the power of 
                working together.
              </p>
              <p className={styles.highlight}>
                With an app like LockedIn, we could have found our teammates sooner, with more trust and ease. 
                That&apos;s exactly what we want to provide for you.
              </p>
            </div>
          </div>
          
          <div className={styles.groupPhotoContainer}>
            <Image 
              src="/group-photo.jpeg" 
              alt="LockedIn Team" 
              width={500} 
              height={500} 
              className={styles.groupPhoto}
            />
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className={styles.missionSection}>
        <h3 className={styles.sectionTitle}>Our Mission</h3>
        <p className={styles.missionText}>
          LockedIn is the backbone for students who want to <strong>Lock TF In</strong> 
           and focus on their studies and projects. Whether you need study partners for motivation, 
          teammates for projects, or just want someone to test your knowledge, we&apos;ve got you covered.
        </p>
        <div className={styles.missionQuote}>
          <p>&ldquo;From strangers to study partners - we make academic collaboration effortless.&ldquo;</p>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.features}>
        <h3 className={styles.sectionTitle}>What Makes LockedIn Special</h3>
        <div className={styles.featureGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureEmoji}>🤝</div>
            <h4>Find Your Study Tribe</h4>
            <p>
              Connect with like-minded students based on your courses, study goals, and availability. 
              No more awkward cold approaches or relying on friends of friends.
            </p>
          </div>
          
          <div className={styles.featureCard}>
            <div className={styles.featureEmoji}>📅</div>
            <h4>Smart Session Planning</h4>
            <p>
              Organize group study sessions, set reminders, and coordinate schedules seamlessly. 
              Never miss a deadline or study session again.
            </p>
          </div>
          
          <div className={styles.featureCard}>
            <div className={styles.featureEmoji}>📊</div>
            <h4>Track Your Success</h4>
            <p>
              Visualize your study habits, monitor improvement, and celebrate milestones with your study partners. 
              Stay motivated and accountable.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <h3 className={styles.ctaTitle}>Ready to Lock In?</h3>
        <p className={styles.ctaText}>
          Join thousands of students who are already studying smarter, not harder.
        </p>
        <div className={styles.ctaButtons}>
          <Link href="/signup">
            <button className={styles.ctaPrimary}>Sign Up Free</button>
          </Link>
          <Link href="/about">
            <button className={styles.ctaSecondary}>Learn More</button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerLogo}>
            <Image src="/logo.png" alt="LockedIn Logo" width={32} height={32} />
            <span>LockedIn</span>
          </div>
          <p className={styles.footerText}>
            Helping university students find their study tribe and achieve academic success together.
          </p>
        </div>
      </footer>
    </main>
  );
}




