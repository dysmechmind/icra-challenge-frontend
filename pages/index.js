import styles from '../styles/Home.module.css';

export default function Home() {
  return (
    <div className={styles.container}>
      <h1>Welcome to the API Service</h1>
      <p>Your gateway to advanced AI models, accessible and affordable for everyone.</p>
      <div>
        <a href="/docs" className={styles.card}>View API Documentation</a>
      </div>
    </div>
  );
}