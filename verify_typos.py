import tldextract

TRUSTED_DOMAINS = {
    "google.com", "microsoft.com", "apple.com", "amazon.com", "meta.com", "facebook.com", "instagram.com", "whatsapp.com",
    "github.com", "gitlab.com", "bitbucket.org", "stackoverflow.com", "reddit.com", "linkedin.com", "twitter.com", "x.com",
    "onrender.com", "vercel.app", "netlify.app", "github.io"
}

def levenshtein_distance(s1, s2):
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)
    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    return previous_row[-1]

def find_lookalike(domain: str):
    if not domain: return None
    for trusted in TRUSTED_DOMAINS:
        dist = levenshtein_distance(domain, trusted)
        if 0 < dist <= 2:
            return trusted
    return None

def test(url):
    ext = tldextract.extract(url)
    root = f"{ext.domain}.{ext.suffix}"
    if root in TRUSTED_DOMAINS:
        return f"{url} -> SAFE (Exact Match)"
    alike = find_lookalike(root)
    if alike:
        return f"{url} -> PHISHING (Look-alike of {alike})"
    return f"{url} -> NEUTRAL (Go to AI)"

print("--- BASIC TESTS ---")
print(test("linkedin.com"))
print(test("linkdin.com"))
print(test("g00gle.com"))
print(test("twitter.com"))

print("\n--- HOSTING PLATFORM TESTS ---")
print(test("https://devnova-8373.onrender.com/"))
print(test("https://my-project.vercel.app"))
print(test("https://user.github.io/repo"))
print(test("https://onrrender.com")) # Typo of onrender.com
