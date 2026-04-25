# CSCI314-Backend
后端环境配置清单 (Checklist)

第一步：基础环境 (Pre-requisites)
1.	Python 3.10+: 确保安装了 Python。
2.	C++ Build Tools (仅限 Windows 用户): 如果安装库时报 greenlet 错误，必须安装 Microsoft C++ Build Tools，并勾选“使用 C++ 的桌面开发”。
第二步：安装依赖指令 (Installation)
请在终端 (Terminal) 执行以下命令：
# 升级 pip 到最新版（避免安装失败）
python -m pip install --upgrade pip

# 安装后端全家桶
pip install fastapi[all] sqlalchemy pyjwt python-multipart passlib[bcrypt]
第三步：项目结构 (Project Structure)
确保文件夹内有以下 4 个核心文件：
•	database.py: 数据库连接配置。
•	models.py: 数据库表模型 (SQLAlchemy)。
•	schemas.py: 数据验证模型 (Pydantic)。
•	main.py: API 接口逻辑与入口。
第四步：运行指令 (Run)
uvicorn main:app --reload
________________________________________
📝 协作建议：
1.	数据库文件：fundraising.db 是自动生成的本地数据库。如果他们修改了 models.py，最好先把旧的 .db 文件删掉再运行，这样系统才会重新创建最新的表结构。
2.	API 测试：、先跑 POST /auth/register 注册一个账号，然后再去 POST /auth/login 拿 Token，最后拿着 Token 去 GET /profile 验证。

