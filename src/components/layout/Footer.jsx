import { Heart } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      id="main-footer"
      className="
        mt-auto
        py-4 px-6
        border-t border-border-light dark:border-border-dark
        bg-surface-light/50 dark:bg-surface-dark/50
        backdrop-blur-sm
      "
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm">
        <p className="
          text-text-secondary-light dark:text-text-secondary-dark
          flex items-center gap-1.5
        ">
          صُنع بـ
          <Heart size={14} className="text-accent-container fill-accent-container animate-pulse" />
          بواسطة فريق AM Analytics
        </p>

        <div className="flex items-center gap-4">
          <a
            href="#"
            className="
              text-text-secondary-light dark:text-text-secondary-dark
              hover:text-primary dark:hover:text-primary-light
              transition-colors duration-200
            "
          >
            سياسة الخصوصية
          </a>
          <span className="text-border-light dark:text-border-dark">|</span>
          <a
            href="#"
            className="
              text-text-secondary-light dark:text-text-secondary-dark
              hover:text-primary dark:hover:text-primary-light
              transition-colors duration-200
            "
          >
            الشروط والأحكام
          </a>
          <span className="text-border-light dark:text-border-dark">|</span>
          <span className="text-text-secondary-light/60 dark:text-text-secondary-dark/60">
            © {currentYear}
          </span>
        </div>
      </div>
    </footer>
  );
}
