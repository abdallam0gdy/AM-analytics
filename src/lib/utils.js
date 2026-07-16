/**
 * Shared utility functions for AM Analytics
 */

// Consistent avatar color generator based on name hash
export function getAvatarColor(name) {
  if (!name) return '#4F46E5';
  const colors = ['#4F46E5', '#059669', '#DC2626', '#D97706', '#7C3AED', '#2563EB', '#DB2777'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

// Robust copy to clipboard utility with legacy fallback
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    
    // Legacy fallback
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error("Failed to copy to clipboard:", err);
    return false;
  }
}

// Helper to parse competitor details (handle strengths/weaknesses from JSON fallback inside description)
export function parseCompetitor(competitor) {
  if (!competitor) return competitor;
  let bio = competitor.description || '';
  let strengths = competitor.strengths;
  let weaknesses = competitor.weaknesses;

  if (bio.trim().startsWith('{') && bio.trim().endsWith('}')) {
    try {
      const parsed = JSON.parse(bio);
      bio = parsed.bio || '';
      strengths = strengths || parsed.strengths || [];
      weaknesses = weaknesses || parsed.weaknesses || [];
    } catch (e) {
      console.error('Failed to parse competitor description JSON:', e);
    }
  }

  return {
    ...competitor,
    description: bio,
    strengths: strengths && strengths.length > 0 ? strengths : null,
    weaknesses: weaknesses && weaknesses.length > 0 ? weaknesses : null
  };
}

