class PostsController < ApplicationController
  def index
   # @new_post = Clip.new
  end

  def new_posts
    @new_post = Clip.new
  end

  def create_posts
    @new_post = Clip.new(post_params)
    if @new_post.save
      redirect_to post_path, notice: 'クリップが正常に作成されました。'
    else
      render :new_posts
    end
  end

  private
  def post_params
    params.require(:clip).permit(:title, :description, :video)
  end
end
