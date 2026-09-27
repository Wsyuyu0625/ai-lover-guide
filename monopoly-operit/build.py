# -*- coding: utf-8 -*-
# 用法： python3 build.py
# 作用：
#   1) 把 src/ui/monopoly.ui.js.part1 + .part2 拼回 monopoly.ui.js
#   2) 把 src/ 打成 com.yuheng.monopoly.toolpkg（可直接放进 Operit 用）
import os
import zipfile

here = os.path.dirname(os.path.abspath(__file__))
root = os.path.join(here, "src")
ui1 = os.path.join(root, "ui", "monopoly.ui.js.part1")
ui2 = os.path.join(root, "ui", "monopoly.ui.js.part2")
ui = os.path.join(root, "ui", "monopoly.ui.js")

if os.path.exists(ui1) and os.path.exists(ui2):
    with open(ui1, "rb") as f1, open(ui2, "rb") as f2, open(ui, "wb") as fo:
        fo.write(f1.read())
        fo.write(f2.read())
    print("[1/2] 已拼装 ui/monopoly.ui.js")
else:
    print("[1/2] 没找到 part 文件，跳过拼装（假定 monopoly.ui.js 已存在）")

out = os.path.join(here, "com.yuheng.monopoly.toolpkg")
z = zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED)
for base, dirs, files in os.walk(root):
    for f in sorted(files):
        if f.endswith(".part1") or f.endswith(".part2"):
            continue
        p = os.path.join(base, f)
        z.write(p, os.path.relpath(p, root))
z.close()
print("[2/2] 打包完成：", out, os.path.getsize(out), "bytes")
print()
print("把它复制到： Android/data/com.ai.assistance.operit/files/packages/ 然后重开 Operit")
