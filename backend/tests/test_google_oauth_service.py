import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from datetime import datetime
from fastapi import HTTPException

from app.services.google_oauth_service import GoogleOAuthService
from app.models.user import GoogleOAuthUser, UserInDB, AuthProvider, UserTier


@pytest.fixture
def mock_db():
    """Mock database for testing"""
    db = MagicMock()
    db.users = AsyncMock()
    return db


@pytest.fixture
def google_oauth_service(mock_db):
    """Create GoogleOAuthService instance with mocked dependencies"""
    with patch('app.services.google_oauth_service.settings') as mock_settings:
        mock_settings.google_client_id = "test-client-id"
        mock_settings.google_client_secret = "test-client-secret" 
        mock_settings.google_redirect_uri = "http://localhost:8000/api/auth/google/callback"
        
        service = GoogleOAuthService(mock_db)
        return service


@pytest.fixture
def sample_google_user():
    """Sample Google OAuth user data"""
    return GoogleOAuthUser(
        google_id="123456789",
        email="test@example.com",
        first_name="John",
        last_name="Doe",
        profile_picture="https://example.com/photo.jpg",
        verified_email=True
    )


@pytest.fixture
def sample_user_info():
    """Sample user info from Google API"""
    return {
        "id": "123456789",
        "email": "test@example.com",
        "given_name": "John",
        "family_name": "Doe",
        "picture": "https://example.com/photo.jpg",
        "verified_email": True
    }


class TestGoogleOAuthService:
    """Test suite for GoogleOAuthService"""
    
    def test_get_authorization_url(self, google_oauth_service):
        """Test generation of Google OAuth authorization URL"""
        url = google_oauth_service.get_authorization_url()
        
        assert "accounts.google.com/o/oauth2/auth" in url
        assert "client_id=test-client-id" in url
        assert "redirect_uri=" in url
        assert "scope=openid+email+profile" in url
        assert "response_type=code" in url
        assert "access_type=offline" in url
        assert "prompt=consent" in url
    
    def test_get_authorization_url_with_state(self, google_oauth_service):
        """Test authorization URL generation with state parameter"""
        state = "random-state-123"
        url = google_oauth_service.get_authorization_url(state)
        
        assert f"state={state}" in url
    
    @pytest.mark.asyncio
    async def test_exchange_code_for_tokens_success(self, google_oauth_service):
        """Test successful token exchange"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "access_token": "access-token-123",
            "id_token": "id-token-123",
            "refresh_token": "refresh-token-123",
            "expires_in": 3600
        }
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(return_value=mock_response)
            
            tokens = await google_oauth_service.exchange_code_for_tokens("auth-code-123")
            
            assert tokens["access_token"] == "access-token-123"
            assert tokens["id_token"] == "id-token-123"
            assert tokens["refresh_token"] == "refresh-token-123"
    
    @pytest.mark.asyncio
    async def test_exchange_code_for_tokens_failure(self, google_oauth_service):
        """Test failed token exchange"""
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.text = "Invalid authorization code"
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(return_value=mock_response)
            
            with pytest.raises(HTTPException) as exc_info:
                await google_oauth_service.exchange_code_for_tokens("invalid-code")
            
            assert exc_info.value.status_code == 500
            assert "Authentication failed" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_verify_id_token_success(self, google_oauth_service):
        """Test successful ID token verification"""
        mock_idinfo = {
            "iss": "accounts.google.com",
            "sub": "123456789",
            "email": "test@example.com",
            "given_name": "John",
            "family_name": "Doe"
        }
        
        with patch('google.oauth2.id_token.verify_oauth2_token', return_value=mock_idinfo):
            result = await google_oauth_service.verify_id_token("valid-id-token")
            
            assert result == mock_idinfo
    
    @pytest.mark.asyncio
    async def test_verify_id_token_invalid_issuer(self, google_oauth_service):
        """Test ID token verification with invalid issuer"""
        mock_idinfo = {
            "iss": "evil.com",
            "sub": "123456789",
            "email": "test@example.com"
        }
        
        with patch('google.oauth2.id_token.verify_oauth2_token', return_value=mock_idinfo):
            with pytest.raises(HTTPException) as exc_info:
                await google_oauth_service.verify_id_token("invalid-issuer-token")
            
            assert exc_info.value.status_code == 500
            assert "Token verification failed" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_get_user_info_success(self, google_oauth_service, sample_user_info):
        """Test successful user info retrieval"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = sample_user_info
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)
            
            user_info = await google_oauth_service.get_user_info("access-token-123")
            
            assert user_info == sample_user_info
    
    def test_extract_user_data(self, google_oauth_service, sample_user_info):
        """Test user data extraction from Google user info"""
        google_user = google_oauth_service._extract_user_data(sample_user_info)
        
        assert google_user.google_id == "123456789"
        assert google_user.email == "test@example.com"
        assert google_user.first_name == "John"
        assert google_user.last_name == "Doe"
        assert google_user.profile_picture == "https://example.com/photo.jpg"
        assert google_user.verified_email is True
    
    def test_extract_user_data_with_name_fallback(self, google_oauth_service):
        """Test user data extraction when given_name/family_name not available"""
        user_info = {
            "id": "123456789",
            "email": "test@example.com",
            "name": "John Doe",
            "picture": "https://example.com/photo.jpg",
            "verified_email": True
        }
        
        google_user = google_oauth_service._extract_user_data(user_info)
        
        assert google_user.first_name == "John"
        assert google_user.last_name == "Doe"
    
    @pytest.mark.asyncio
    async def test_create_new_user(self, google_oauth_service, sample_google_user, mock_db):
        """Test creating new user from Google OAuth data"""
        mock_db.users.insert_one = AsyncMock()
        
        with patch('app.services.google_oauth_service.datetime') as mock_datetime:
            mock_datetime.utcnow.return_value = datetime(2023, 1, 1, 12, 0, 0)
            
            user = await google_oauth_service._create_new_user(sample_google_user)
            
            assert user.email == sample_google_user.email
            assert user.first_name == sample_google_user.first_name
            assert user.last_name == sample_google_user.last_name
            assert user.provider == AuthProvider.GOOGLE
            assert user.google_id == sample_google_user.google_id
            assert user.is_verified is True
            assert user.hashed_password is None
            
            # Verify user was inserted into database
            mock_db.users.insert_one.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_create_or_update_user_new_user(self, google_oauth_service, sample_google_user, mock_db):
        """Test creating new user when user doesn't exist"""
        # Mock no existing user
        mock_db.users.find_one = AsyncMock(return_value=None)
        mock_db.users.insert_one = AsyncMock()
        mock_db.users.update_one = AsyncMock()
        
        with patch('app.services.google_oauth_service.create_tokens') as mock_create_tokens:
            mock_create_tokens.return_value = {
                "access_token": "access-123",
                "refresh_token": "refresh-123",
                "token_type": "bearer"
            }
            
            with patch('app.services.google_oauth_service.datetime') as mock_datetime:
                mock_datetime.utcnow.return_value = datetime(2023, 1, 1, 12, 0, 0)
                
                result = await google_oauth_service.create_or_update_user(sample_google_user)
                
                assert "user" in result
                assert "access_token" in result
                assert result["user"]["email"] == sample_google_user.email
                assert result["user"]["provider"] == AuthProvider.GOOGLE
    
    @pytest.mark.asyncio
    async def test_create_or_update_user_existing_user(self, google_oauth_service, sample_google_user, mock_db):
        """Test updating existing user"""
        existing_user_doc = {
            "_id": "existing-user-id",
            "email": sample_google_user.email,
            "first_name": "Old Name",
            "last_name": "Old Last",
            "provider": AuthProvider.EMAIL,
            "google_id": None,
            "is_verified": False,
            "created_at": datetime(2022, 1, 1),
            "subscription": {"tier": UserTier.FREE},
            "usage": {"workflows_created": 0}
        }
        
        updated_user_doc = {
            **existing_user_doc,
            "first_name": sample_google_user.first_name,
            "last_name": sample_google_user.last_name,
            "provider": AuthProvider.GOOGLE,
            "google_id": sample_google_user.google_id,
            "is_verified": True
        }
        
        mock_db.users.find_one = AsyncMock(side_effect=[existing_user_doc, updated_user_doc])
        mock_db.users.update_one = AsyncMock()
        
        with patch('app.services.google_oauth_service.create_tokens') as mock_create_tokens:
            mock_create_tokens.return_value = {
                "access_token": "access-123",
                "refresh_token": "refresh-123", 
                "token_type": "bearer"
            }
            
            result = await google_oauth_service.create_or_update_user(sample_google_user)
            
            assert "user" in result
            assert result["user"]["first_name"] == sample_google_user.first_name
            assert result["user"]["provider"] == AuthProvider.GOOGLE
            
            # Verify user was updated (expects 2 calls: user profile update + last_login update)
            assert mock_db.users.update_one.call_count == 2
    
    @pytest.mark.asyncio
    async def test_link_google_account_success(self, google_oauth_service, sample_google_user, mock_db):
        """Test successful Google account linking"""
        # Mock no existing Google user
        mock_db.users.find_one = AsyncMock(return_value=None)
        mock_db.users.update_one = AsyncMock(return_value=MagicMock(modified_count=1))
        
        result = await google_oauth_service.link_google_account("user-123", sample_google_user)
        
        assert result is True
        mock_db.users.update_one.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_link_google_account_already_linked(self, google_oauth_service, sample_google_user, mock_db):
        """Test linking Google account that's already linked to another user"""
        existing_user = {"_id": "other-user-id", "google_id": sample_google_user.google_id}
        mock_db.users.find_one = AsyncMock(return_value=existing_user)
        
        with pytest.raises(HTTPException) as exc_info:
            await google_oauth_service.link_google_account("user-123", sample_google_user)
        
        assert exc_info.value.status_code == 409
        assert "already linked to another user" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_unlink_google_account_success(self, google_oauth_service, mock_db):
        """Test successful Google account unlinking"""
        mock_db.users.update_one = AsyncMock(return_value=MagicMock(modified_count=1))
        
        result = await google_oauth_service.unlink_google_account("user-123")
        
        assert result is True
        mock_db.users.update_one.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_unlink_google_account_failure(self, google_oauth_service, mock_db):
        """Test failed Google account unlinking"""
        mock_db.users.update_one = AsyncMock(return_value=MagicMock(modified_count=0))
        
        result = await google_oauth_service.unlink_google_account("user-123")
        
        assert result is False