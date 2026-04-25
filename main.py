from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from database import supabase
from pprint import pprint
from datetime import datetime, timedelta

import models
import schemas
import jwt

# 1. Initialize the database table (fundraising.db will be created automatically when the code is run)
init_db()

app = FastAPI(title="Online Fundraising API", description="Sprint 1: IAM Module")
SECRET_KEY = "CSIT314_SUPER_SECRET_KEY_NEVER_SHARE"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 # Pass expires in 30 minutes

# Tell FastAPI where our login interface is located
#(for automatically generating the padlock header in the documentation)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# 1.2 Helper function: Verify password
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

# 1.3 Helper function: Creating a JWT token
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    # 使用密钥签名生成字符串
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# 2. Configure the password encryption context (Story 9: Ethics & Security)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


# 3. Dependency Injection: Obtaining a Database Session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ===========================================
# 4. API Interface: User Registration
# ============================================
@app.post("/auth/register", response_model=schemas.UserResponse)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Step A: Check if the email address has already been registered.
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="邮箱已被注册！")

    # Step B: Hash and encrypt the plaintext password using Bcrypt
    hashed_pwd = get_password_hash(user.password)

    # Step C: Load data into the SQLAlchemy database model
    new_user = models.User(
        email=user.email,
        hashed_password=hashed_pwd,
        full_name=user.full_name,
        phone_number=user.phone_number
        # Note: The role and status will automatically use the default values
        # (DONEE / PENDING) from models.py.
    )

    # Step D: Save to database
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


# ==========================================
# 5. Added API interface: User Login (Story 1)
# ==========================================
@app.post("/auth/login", response_model=schemas.Token)
def login_for_access_token(
        # The OAuth2 specification requires the front-end to send a username,
        # so we use username here to receive the user's email address.
        form_data: OAuth2PasswordRequestForm = Depends(),
        db: Session = Depends(get_db)
):
    # a. Search for this user in the database
    user = db.query(models.User).filter(models.User.email == form_data.username).first()

    # b. If the user does not exist, or the password is incorrect
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # c. What if the account is banned by the administrator? (Foreshadowing in Story 11)
    if user.status == models.UserStatus.SUSPENDED:
        raise HTTPException(status_code=400, detail="This account has been banned.")

    # d. Issue a token and include the user's email address in the payload.
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


# 6. Core security function: Parse the token and get the current user
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无效的凭证",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Decrypting the Token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    return user


# ==========================================
# 7. Added API Interface: View Profile (Story 3)
# By simply adding `Depends(get_current_user)`,
# this interface becomes "Login Required to Access".
# ==========================================
@app.get("/profile", response_model=schemas.UserResponse)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    # If you've reached this point, the token is valid,
    # and the parsed user information should be returned directly.
    return current_user