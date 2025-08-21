#!/usr/bin/env python3
"""
Generate fake SRT files for testing the SRT search application.
Creates realistic subtitle content with proper timing.
"""

import os
import sys
import random
import argparse
from pathlib import Path

# Sample content for generating realistic subtitles
SAMPLE_SENTENCES = [
    "Welcome to our comprehensive tutorial series.",
    "Today we're going to learn about machine learning.",
    "Let's start with the basic concepts and terminology.",
    "Data preprocessing is a crucial first step.",
    "We need to clean and transform our data.",
    "Feature engineering can significantly improve results.",
    "Now let's discuss different algorithms and approaches.",
    "Linear regression is one of the simplest methods.",
    "Decision trees are easy to interpret and understand.",
    "Random forests combine multiple decision trees.",
    "Neural networks are inspired by the human brain.",
    "Deep learning has revolutionized many fields.",
    "Computer vision enables machines to see and understand.",
    "Natural language processing works with text data.",
    "Clustering helps us find patterns in data.",
    "Cross-validation helps us evaluate model performance.",
    "Overfitting occurs when models are too complex.",
    "Regularization techniques can prevent overfitting.",
    "Hyperparameter tuning optimizes model performance.",
    "Feature selection reduces dimensionality.",
    "The training process involves learning from data.",
    "Testing evaluates how well our model generalizes.",
    "Accuracy measures correct predictions over total predictions.",
    "Precision focuses on positive prediction accuracy.",
    "Recall measures how many positives we found.",
    "F1-score balances precision and recall.",
    "Confusion matrices show detailed performance.",
    "ROC curves help evaluate binary classifiers.",
    "Ensemble methods combine multiple models.",
    "Gradient descent optimizes model parameters.",
    "Backpropagation trains neural networks.",
    "Convolutional layers process image data.",
    "Recurrent networks handle sequential data.",
    "Attention mechanisms focus on relevant information.",
    "Transfer learning leverages pre-trained models.",
    "Reinforcement learning learns through interaction.",
    "Unsupervised learning finds hidden patterns.",
    "Dimensionality reduction simplifies complex data.",
    "Principal component analysis finds key directions.",
    "K-means clustering groups similar data points.",
    "Thank you for watching this tutorial.",
    "Don't forget to subscribe and like the video.",
    "Check out our other courses for more learning.",
    "Practice makes perfect in machine learning.",
    "Start with simple projects and build up.",
    "The field is constantly evolving and growing.",
    "Keep learning and experimenting with new techniques.",
    "Good luck on your machine learning journey!"
]

def format_time(ms):
    """Convert milliseconds to SRT time format HH:MM:SS,mmm"""
    total_seconds = ms // 1000
    milliseconds = ms % 1000
    
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    seconds = total_seconds % 60
    
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{milliseconds:03d}"

def generate_srt_content(duration_minutes=30, words_per_minute=150):
    """Generate SRT content for specified duration"""
    # Calculate approximate number of subtitles
    total_words = duration_minutes * words_per_minute
    avg_words_per_subtitle = 8
    num_subtitles = total_words // avg_words_per_subtitle
    
    # Duration in milliseconds
    total_duration_ms = duration_minutes * 60 * 1000
    
    # Generate subtitles
    srt_content = []
    current_time_ms = 0
    
    for i in range(num_subtitles):
        # Random subtitle duration between 2-6 seconds
        subtitle_duration = random.randint(2000, 6000)
        
        # Ensure we don't exceed total duration
        if current_time_ms + subtitle_duration > total_duration_ms:
            subtitle_duration = total_duration_ms - current_time_ms
        
        start_time = current_time_ms
        end_time = current_time_ms + subtitle_duration
        
        # Pick 1-3 sentences for this subtitle
        num_sentences = random.randint(1, 3)
        sentences = random.sample(SAMPLE_SENTENCES, min(num_sentences, len(SAMPLE_SENTENCES)))
        text = " ".join(sentences)
        
        # Format SRT entry
        srt_entry = f"""{i + 1}
{format_time(start_time)} --> {format_time(end_time)}
{text}

"""
        srt_content.append(srt_entry)
        
        # Move to next subtitle with small gap
        current_time_ms = end_time + random.randint(100, 500)
        
        if current_time_ms >= total_duration_ms:
            break
    
    return "".join(srt_content)

def create_fake_media_structure(base_dir, num_videos=10):
    """Create a fake media directory structure with videos and SRTs"""
    base_path = Path(base_dir)
    base_path.mkdir(parents=True, exist_ok=True)
    
    # Create some subdirectories
    subdirs = [
        "documentaries",
        "tutorials",
        "lectures",
        "interviews"
    ]
    
    for subdir in subdirs:
        (base_path / subdir).mkdir(exist_ok=True)
    
    video_names = [
        "Introduction_to_Machine_Learning",
        "Deep_Learning_Fundamentals",
        "Neural_Network_Basics",
        "Computer_Vision_Tutorial",
        "NLP_Getting_Started",
        "Data_Science_Workshop",
        "Python_Programming_101",
        "Statistics_for_ML",
        "Feature_Engineering",
        "Model_Evaluation",
        "Advanced_Algorithms",
        "Reinforcement_Learning",
        "Time_Series_Analysis",
        "Unsupervised_Learning",
        "Transfer_Learning",
        "Ethics_in_AI",
        "MLOps_Best_Practices",
        "Deploying_ML_Models",
        "Research_Methods",
        "Industry_Case_Studies"
    ]
    
    created_files = []
    
    for i in range(min(num_videos, len(video_names))):
        video_name = video_names[i]
        
        # Randomly choose directory
        target_dir = base_path / random.choice(subdirs)
        
        # Create video file (empty placeholder)
        video_ext = random.choice(['.mp4', '.avi'])
        video_file = target_dir / f"{video_name}{video_ext}"
        video_file.touch()
        
        # 80% chance of having SRT file
        if random.random() < 0.8:
            # Generate SRT content
            duration = random.randint(15, 60)  # 15-60 minutes
            srt_content = generate_srt_content(duration)
            
            # Write SRT file
            srt_file = target_dir / f"{video_name}.srt"
            with open(srt_file, 'w', encoding='utf-8') as f:
                f.write(srt_content)
            
            created_files.append((str(video_file), str(srt_file)))
        else:
            created_files.append((str(video_file), None))
    
    return created_files

def main():
    parser = argparse.ArgumentParser(description="Generate fake SRT files for testing")
    parser.add_argument("--output", "-o", default="./test_media", 
                       help="Output directory for test files")
    parser.add_argument("--count", "-c", type=int, default=10,
                       help="Number of video files to create")
    parser.add_argument("--srt-only", action="store_true",
                       help="Only create SRT files, no video placeholders")
    
    args = parser.parse_args()
    
    if args.srt_only:
        # Just create standalone SRT files
        output_path = Path(args.output)
        output_path.mkdir(parents=True, exist_ok=True)
        
        for i in range(args.count):
            filename = f"sample_{i+1:02d}.srt"
            duration = random.randint(20, 45)
            content = generate_srt_content(duration)
            
            with open(output_path / filename, 'w', encoding='utf-8') as f:
                f.write(content)
            
            print(f"Created {filename}")
    else:
        # Create full media structure
        created_files = create_fake_media_structure(args.output, args.count)
        
        print(f"Created test media structure in {args.output}")
        print(f"Generated {len(created_files)} video files:")
        
        with_srt = sum(1 for _, srt in created_files if srt)
        without_srt = len(created_files) - with_srt
        
        print(f"  - {with_srt} with SRT files")
        print(f"  - {without_srt} without SRT files")
        
        # Show some examples
        print("\nSample files:")
        for video, srt in created_files[:5]:
            print(f"  {video}")
            if srt:
                print(f"  {srt}")
            print()

if __name__ == "__main__":
    main()