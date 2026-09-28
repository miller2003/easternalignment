import re, os
SRC = r"C:\Users\samja\Desktop\EA资料\posthog-query\README.md"
DST = r"C:\Users\samja\Desktop\site\easternalignment\scratch\_readme_redacted.md"
txt = open(SRC, "r", encoding="utf-8", errors="replace").read()
txt = re.sub(r"phx_[A-Za-z0-9]+", "phx_REDACTED", txt)
open(DST, "w", encoding="utf-8").write(txt)
print("lines:", txt.count("\n"), "chars:", len(txt))
