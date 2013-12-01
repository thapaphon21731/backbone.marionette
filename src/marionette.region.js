// Region
// ------
//
// Manage the visual regions of your composite application. See
// http://lostechies.com/derickbailey/2011/12/12/composite-js-apps-regions-and-region-managers/

Marionette.Region = function(options){
  this.options = options || {};
  this.el = Marionette.getOption(this, "el");

  if (!this.el){
    throwError("An 'el' must be specified for a region.", "NoElError");
  }

  if (this.initialize){
    var args = Array.prototype.slice.apply(arguments);
    this.initialize.apply(this, args);
  }
};


// Region Type methods
// -------------------

_.extend(Marionette.Region, {

  // Build an instance of a region by passing in a configuration object
  // and a default region type to use if none is specified in the config.
  //
  // The config object should either be a string as a jQuery DOM selector,
  // a Region type directly, or an object literal that specifies both
  // a selector and regionType:
  //
  // ```js
  // {
  //   selector: "#foo",
  //   regionType: MyCustomRegion
  // }
  // ```
  //
  buildRegion: function(regionConfig, defaultRegionType){
    var regionIsString = _.isString(regionConfig);
    var regionSelectorIsString = _.isString(regionConfig.selector);
    var regionTypeIsUndefined = _.isUndefined(regionConfig.regionType);
    var regionIsType = _.isFunction(regionConfig);

    if (!regionIsType && !regionIsString && !regionSelectorIsString) {
      throwError("Region must be specified as a Region type, a selector string or an object with selector property");
    }

    var selector, RegionType;

    // get the selector for the region

    if (regionIsString) {
      selector = regionConfig;
    }

    if (regionConfig.selector) {
      selector = regionConfig.selector;
      delete regionConfig.selector;
    }

    // get the type for the region

    if (regionIsType){
      RegionType = regionConfig;
    }

    if (!regionIsType && regionTypeIsUndefined) {
      RegionType = defaultRegionType;
    }

    if (regionConfig.regionType) {
      RegionType = regionConfig.regionType;
      delete regionConfig.regionType;
    }

    if (regionIsString || regionIsType) {
      regionConfig = {};
    }

    regionConfig.el = selector;

    // build the region instance
    var region = new RegionType(regionConfig);

    // override the `getEl` function if we have a parentEl
    // this must be overridden to ensure the selector is found
    // on the first use of the region. if we try to assign the
    // region's `el` to `parentEl.find(selector)` in the object
    // literal to build the region, the element will not be
    // guaranteed to be in the DOM already, and will cause problems
    if (regionConfig.parentEl){
      region.getEl = function(selector) {
        var parentEl = regionConfig.parentEl;
        if (_.isFunction(parentEl)){
          parentEl = parentEl();
        }
        return parentEl.find(selector);
      };
    }

    return region;
  }

});

// Region Instance Methods
// -----------------------

_.extend(Marionette.Region.prototype, Backbone.Events, {

  // Displays a backbone view instance inside of the region.
  // Handles calling the `render` method for you. Reads content
  // directly from the `el` attribute. Also calls an optional
  // `onShow` and `onDestroy` method on your view, just after showing
  // or just before destroying the view, respectively.
  // The `preventDestroy` option can be used to prevent a view from the old view being destroyed on show.
  show: function(view, options){
    this.ensureEl();

    var showOptions = options || {};
    var isViewDestroyed = view.isDestroyed || _.isUndefined(view.$el);
    var isDifferentView = view !== this.currentView;
    var preventDestroy =  !!showOptions.preventDestroy;

    // only destroy the view if we don't want to preventDestroy and the view is different
    var _shouldDestroyView = !preventDestroy && isDifferentView;

    if (_shouldDestroyView) {
      this.destroy();
    }

    view.render();
    Marionette.triggerMethod.call(this, "before:show", view);

    if (_.isFunction(view.triggerMethod)) {
      view.triggerMethod("before:show");
    } else {
      Marionette.triggerMethod.call(view, "before:show");
    }

    if (isDifferentView) {
      this.open(view);
    }

    this.currentView = view;

    Marionette.triggerMethod.call(this, "show", view);

    if (_.isFunction(view.triggerMethod)) {
      view.triggerMethod("show");
    } else {
      Marionette.triggerMethod.call(view, "show");
    }

    return this;
  },

  ensureEl: function(){
    if (!this.$el || this.$el.length === 0){
      this.$el = this.getEl(this.el);
    }

    if (this.$el.length === 0) {
      throwError("An 'el' " + this.el + " must exist in DOM");
    }
  },

  // Override this method to change how the region finds the
  // DOM element that it manages. Return a jQuery selector object.
  getEl: function(selector){
    return Backbone.$(selector);
  },

  // Override this method to change how the new view is
  // appended to the `$el` that the region is managing
  open: function(view){
    this.$el.empty().append(view.el);
  },

  // Destroy the current view, if there is one. If there is no
  // current view, it does nothing and returns immediately.
  destroy: function(){
    var view = this.currentView;
    if (!view || view.isDestroyed){ return; }

    // call 'destroy' or 'remove', depending on which is found
    if (view.destroy) { view.destroy(); }
    else if (view.remove) { view.remove(); }

    Marionette.triggerMethod.call(this, "destroy", view);

    delete this.currentView;
  },

  // Attach an existing view to the region. This
  // will not call `render` or `onShow` for the new view,
  // and will not replace the current HTML for the `el`
  // of the region.
  attachView: function(view){
    this.currentView = view;
  },

  // Reset the region by destroying any existing view and
  // clearing out the cached `$el`. The next time a view
  // is shown via this region, the region will re-query the
  // DOM for the region's `el`.
  reset: function(){
    this.destroy();
    delete this.$el;
  }
});

// Copy the `extend` function used by Backbone's classes
Marionette.Region.extend = Marionette.extend;
