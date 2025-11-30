"""
AI Preferences Router
Handles user AI customization preferences from questionnaire
"""

import os
import logging
import sys
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any

# Set up logger
logger = logging.getLogger(__name__)

# Import repository
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'data', 'repositories'))
from ai_preferences_repository import AIPreferencesRepository

# Create router
router = APIRouter(prefix="/api/ai-preferences", tags=["ai-preferences"])

# Request/Response Models
class TonePreferences(BaseModel):
    """Step 1: AI tone preferences"""
    formality: Optional[str] = None
    conciseness: Optional[str] = None
    proactiveness: Optional[str] = None
    onBrandPhrases: Optional[str] = None
    avoidPhrases: Optional[str] = None


class GuardrailPreferences(BaseModel):
    """Step 2: AI guardrails"""
    guardrailTopics: Optional[str] = None
    avoidTopics: Optional[str] = None
    otherClaims: Optional[str] = None


class AudiencePreferences(BaseModel):
    """Step 3: Target audience"""
    idealCustomers: Optional[str] = None
    roles: Optional[str] = None
    products: Optional[str] = None


class AdditionalContextPreferences(BaseModel):
    """Step 4: Additional context"""
    additionalContext: Optional[str] = None


class SaveAIPreferencesRequest(BaseModel):
    """Request to save AI preferences"""
    email: EmailStr
    tone: TonePreferences
    guardrails: GuardrailPreferences
    audience: AudiencePreferences
    additional_context: AdditionalContextPreferences


class AIPreferencesResponse(BaseModel):
    """Response with AI preferences"""
    success: bool
    message: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None


async def generate_ai_summary(tone: dict, guardrails: dict, audience: dict, additional_context: dict) -> str:
    """
    Generate AI summary using LLM.
    TODO: Integrate with actual LLM service (OpenAI, Claude, etc.)
    For now, returns a structured summary.
    """
    try:
        # TODO: Replace with actual LLM API call
        # For now, create a structured text summary
        summary_parts = []

        # Tone section
        if any(tone.values()):
            tone_summary = "Communication Style: "
            tone_details = []
            if tone.get('formality'):
                tone_details.append(f"Use a {tone['formality'].lower()} tone")
            if tone.get('conciseness'):
                tone_details.append(f"be {tone['conciseness'].lower()}")
            if tone.get('proactiveness'):
                tone_details.append(f"take a {tone['proactiveness'].lower()} approach")

            if tone_details:
                tone_summary += ', '.join(tone_details) + ". "

            if tone.get('onBrandPhrases'):
                tone_summary += f"Always use phrases like: {tone['onBrandPhrases']}. "
            if tone.get('avoidPhrases'):
                tone_summary += f"Never use phrases like: {tone['avoidPhrases']}. "

            summary_parts.append(tone_summary.strip())

        # Guardrails section
        if any(guardrails.values()):
            guardrail_summary = "Restrictions: "
            guardrail_details = []
            if guardrails.get('guardrailTopics'):
                guardrail_details.append(f"Avoid topics: {guardrails['guardrailTopics']}")
            if guardrails.get('avoidTopics'):
                guardrail_details.append(f"Never discuss: {guardrails['avoidTopics']}")
            if guardrails.get('otherClaims'):
                guardrail_details.append(f"Do not make claims about: {guardrails['otherClaims']}")

            if guardrail_details:
                guardrail_summary += '; '.join(guardrail_details) + ". "

            summary_parts.append(guardrail_summary.strip())

        # Audience section
        if any(audience.values()):
            audience_summary = "Target Audience: "
            audience_details = []
            if audience.get('idealCustomers'):
                audience_details.append(f"Focus on {audience['idealCustomers']}")
            if audience.get('roles'):
                audience_details.append(f"targeting {audience['roles']}")
            if audience.get('products'):
                audience_details.append(f"Highlight: {audience['products']}")

            if audience_details:
                audience_summary += '; '.join(audience_details) + ". "

            summary_parts.append(audience_summary.strip())

        # Additional context section
        if additional_context.get('additionalContext'):
            summary_parts.append(f"Additional Context: {additional_context['additionalContext']}")

        final_summary = "\n\n".join(summary_parts)

        logger.info(f"Generated AI summary: {final_summary[:100]}...")
        return final_summary

    except Exception as e:
        logger.error(f"Error generating AI summary: {e}")
        # Return a basic summary if LLM fails
        return "AI preferences saved. Please configure LLM service for detailed summary."


@router.post("/save", response_model=AIPreferencesResponse)
async def save_ai_preferences(request: SaveAIPreferencesRequest):
    """
    Save user AI preferences from questionnaire.
    Stores original responses in JSONB columns and generates LLM summary.
    """
    try:
        logger.info(f"Saving AI preferences for user: {request.email}")

        # Convert Pydantic models to dict
        tone_dict = request.tone.dict(exclude_none=True)
        guardrails_dict = request.guardrails.dict(exclude_none=True)
        audience_dict = request.audience.dict(exclude_none=True)
        additional_context_dict = request.additional_context.dict(exclude_none=True)

        # Generate AI summary
        ai_summary = await generate_ai_summary(
            tone_dict,
            guardrails_dict,
            audience_dict,
            additional_context_dict
        )

        # Save to database using repository
        result = AIPreferencesRepository.save_preferences(
            email=request.email,
            tone_dict=tone_dict,
            guardrails_dict=guardrails_dict,
            audience_dict=audience_dict,
            additional_context_dict=additional_context_dict,
            ai_summary=ai_summary
        )

        return AIPreferencesResponse(
            success=True,
            message="AI preferences saved successfully",
            preferences=result["preferences"]
        )

    except Exception as e:
        logger.error(f"Error saving AI preferences: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save AI preferences: {str(e)}"
        )


@router.get("/get/{email}", response_model=AIPreferencesResponse)
async def get_ai_preferences(email: str):
    """
    Get user AI preferences by email.
    """
    try:
        logger.info(f"Fetching AI preferences for user: {email}")

        # Get from database using repository
        preferences = AIPreferencesRepository.get_preferences(email)

        if not preferences:
            return AIPreferencesResponse(
                success=True,
                message="No preferences found for this user",
                preferences=None
            )

        return AIPreferencesResponse(
            success=True,
            message="AI preferences retrieved successfully",
            preferences=preferences
        )

    except Exception as e:
        logger.error(f"Error fetching AI preferences: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch AI preferences: {str(e)}"
        )


@router.delete("/delete/{email}")
async def delete_ai_preferences(email: str):
    """
    Delete user AI preferences by email.
    """
    try:
        logger.info(f"Deleting AI preferences for user: {email}")

        # Delete from database using repository
        deleted = AIPreferencesRepository.delete_preferences(email)

        if deleted:
            return {
                "success": True,
                "message": f"AI preferences deleted for {email}"
            }
        else:
            return {
                "success": False,
                "message": f"No preferences found for {email}"
            }

    except Exception as e:
        logger.error(f"Error deleting AI preferences: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete AI preferences: {str(e)}"
        )
