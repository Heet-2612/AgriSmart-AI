import pytest
from model.inference.predict import predict, ModelNotReadyError

def test_predict_rejects_missing_file():
    """Verify predict(image_path) raises FileNotFoundError if file does not exist."""
    with pytest.raises(FileNotFoundError):
        predict("non_existent_file.jpg")

def test_predict_rejects_invalid_extension(tmp_path):
    """Verify predict(image_path) rejects non-image extensions."""
    test_txt = tmp_path / "test.txt"
    test_txt.write_text("not an image")
    with pytest.raises(ValueError):
        predict(str(test_txt))

def test_predict_raises_model_not_ready_without_checkpoint(tmp_path):
    """Verify predict raises ModelNotReadyError when checkpoint does not exist."""
    fake_img = tmp_path / "leaf.jpg"
    fake_img.write_bytes(b"dummy image data")
    with pytest.raises(ModelNotReadyError):
        predict(str(fake_img), checkpoint_path=tmp_path / "non_existent_model.pt")
